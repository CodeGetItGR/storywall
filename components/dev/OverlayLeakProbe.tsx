'use client';

import { useEffect } from 'react';

// Development-only diagnostic for the "page renders but nothing responds to
// clicks" failure. Every modal surface in the app is a full-screen fixed layer
// (Base UI's own InternalBackdrop, plus each Dialog.Backdrop). If one of those
// outlives the dialog that owned it, it keeps intercepting pointer events while
// looking, at a glance, like the app has simply hung.
//
// Detection is by hit-test rather than by inspecting styles: document
// .elementFromPoint resolves through the same hit-testing the browser uses to
// route real clicks, so whatever it reports at a point is what a click there
// would land on. That sidesteps having to model pointer-events, inert, opacity
// and stacking order separately — an overlay that this still sees on top of a
// real control is, by definition, one that would eat the click.
//
// Renders nothing and is stripped from production builds.

const SETTLE_MS = 250;
const INTERACTIVE_SELECTOR = 'a[href], button:not(:disabled), [role="button"]:not([aria-disabled="true"])';
const SAMPLE_LIMIT = 12;

// Any overlay that is legitimately open is entitled to cover the page — a menu
// or popover backdrop blocks exactly as deliberately as a dialog's does. Base
// UI marks an open surface with data-open; AccountPanelShell renders
// data-open="false" when closed, so presence alone is not enough to test.
const OPEN_OVERLAY_SELECTOR =
    '[role="dialog"], [role="alertdialog"], [role="menu"], [role="listbox"], [role="tooltip"], [data-open]:not([data-open="false"])';

// Controls the page has deliberately taken out of reach. Their own subtree is
// inert (AccountPanelShell does this to the page behind the account panel) or
// they opt out of pointer events entirely — being unclickable is the intent.
function isDeliberatelyUnreachable(control: Element): boolean {
    if (getComputedStyle(control).pointerEvents === 'none') return true;
    return control.closest('[inert], [aria-hidden="true"], [hidden]') !== null;
}

type Interception = { control: Element; blocker: Element };

function describe(element: Element): string {
    const style = getComputedStyle(element);
    return [
        element.tagName.toLowerCase(),
        element.id ? `#${element.id}` : null,
        element.className && typeof element.className === 'string' ? `class="${element.className}"` : null,
        element.getAttribute('role') ? `role="${element.getAttribute('role')}"` : null,
        element.hasAttribute('inert') ? 'inert' : null,
        element.hasAttribute('data-base-ui-inert') ? 'data-base-ui-inert (Base UI InternalBackdrop)' : null,
        element.hasAttribute('data-open') ? 'data-open' : null,
        element.hasAttribute('data-closed') ? 'data-closed' : null,
        `position=${style.position}`,
        `pointer-events=${style.pointerEvents}`,
        `opacity=${style.opacity}`,
        `z-index=${style.zIndex}`,
    ]
        .filter(Boolean)
        .join(' ');
}

function isFullScreenLayer(element: Element): boolean {
    if (getComputedStyle(element).position !== 'fixed') return false;

    const rect = element.getBoundingClientRect();
    return rect.width >= window.innerWidth * 0.9 && rect.height >= window.innerHeight * 0.9;
}

// A control is "reachable" when hit-testing its own centre resolves to itself
// or to something within it — a label or icon inside a button is still the
// button as far as the click is concerned.
function findInterceptions(): Interception[] {
    const interceptions: Interception[] = [];
    const controls = document.querySelectorAll(INTERACTIVE_SELECTOR);
    let sampled = 0;

    for (const control of controls) {
        if (sampled >= SAMPLE_LIMIT) break;

        const rect = control.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) continue;
        if (isDeliberatelyUnreachable(control)) continue;

        const x = rect.left + rect.width / 2;
        const y = rect.top + rect.height / 2;
        if (x < 0 || y < 0 || x > window.innerWidth || y > window.innerHeight) continue;

        sampled += 1;

        const hit = document.elementFromPoint(x, y);
        if (!hit || hit === control || control.contains(hit) || hit.contains(control)) continue;
        if (!isFullScreenLayer(hit)) continue;

        interceptions.push({ control, blocker: hit });
    }

    return interceptions;
}

function report(trigger: string) {
    // An overlay intercepting clicks while one is genuinely open is the normal,
    // correct state. Only an orphan — a layer still covering the page after
    // every overlay has closed — is the bug.
    if (document.querySelector(OPEN_OVERLAY_SELECTOR) !== null) return;

    const interceptions = findInterceptions();
    if (interceptions.length === 0) return;

    // Each blocker is reported once, with a sample of what it swallows, so a
    // truncated console still shows which element is at fault.
    const byBlocker = new Map<Element, Element[]>();
    for (const { blocker, control } of interceptions) {
        byBlocker.set(blocker, [...(byBlocker.get(blocker) ?? []), control]);
    }

    for (const [blocker, controls] of byBlocker) {
        console.error(
            `[OverlayLeakProbe] after "${trigger}": a full-screen layer is swallowing clicks for ${controls.length} on-screen ` +
                `control(s) while no overlay is open — the app looks fine and nothing responds.\n  blocker: ${describe(blocker)}`,
            blocker,
            '\n  sample unreachable control:',
            controls[0]
        );
    }
}

export function OverlayLeakProbe() {
    useEffect(() => {
        if (process.env.NODE_ENV === 'production') return;

        let timeoutId: ReturnType<typeof setTimeout> | undefined;
        // The leak appears mid-teardown, so every check waits for the DOM to
        // stop changing rather than reporting a backdrop still on its way out.
        function scheduleReport(trigger: string) {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => report(trigger), SETTLE_MS);
        }

        const observer = new MutationObserver(() => scheduleReport('dom change'));
        observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['style', 'class', 'inert'],
        });

        const onPopState = () => scheduleReport('browser back/forward');
        window.addEventListener('popstate', onPopState);

        // Manual escape hatch: run window.__overlayLeakCheck() from the console
        // the moment the app stops responding, whether or not the probe fired.
        // Reports what is on top at the centre of the viewport either way, so a
        // silent result still tells you something.
        (window as unknown as { __overlayLeakCheck?: () => void }).__overlayLeakCheck = () => {
            const interceptions = findInterceptions();
            const centre = document.elementFromPoint(window.innerWidth / 2, window.innerHeight / 2);
            console.warn('[OverlayLeakProbe] unclickable controls:', interceptions.length, interceptions);
            console.warn('[OverlayLeakProbe] topmost element at viewport centre:', centre && describe(centre), centre);
            console.warn('[OverlayLeakProbe] dialog mounted:', document.querySelector('[role="dialog"], [role="alertdialog"]') !== null);
        };

        return () => {
            clearTimeout(timeoutId);
            observer.disconnect();
            window.removeEventListener('popstate', onPopState);
            delete (window as unknown as { __overlayLeakCheck?: () => void }).__overlayLeakCheck;
        };
    }, []);

    return null;
}
