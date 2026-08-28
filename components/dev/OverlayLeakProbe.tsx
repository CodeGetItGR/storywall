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
    // An overlay intercepting clicks while a dialog is genuinely mounted is the
    // normal, correct state. Only an orphan is the bug.
    if (document.querySelector('[role="dialog"], [role="alertdialog"]') !== null) return;

    const interceptions = findInterceptions();
    if (interceptions.length === 0) return;

    const blockers = new Set(interceptions.map((interception) => interception.blocker));
    console.error(
        `[OverlayLeakProbe] after "${trigger}": ${interceptions.length} on-screen control(s) are unclickable — a full-screen layer ` +
            `is intercepting their clicks and no dialog is mounted. This is the state where the app looks fine and nothing responds.`
    );
    for (const blocker of blockers) {
        console.error('[OverlayLeakProbe]  blocker:', describe(blocker), blocker);
    }
    for (const { control } of interceptions) {
        console.error('[OverlayLeakProbe]  unreachable:', describe(control), control);
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
