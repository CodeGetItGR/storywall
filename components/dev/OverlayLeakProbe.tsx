'use client';

import { useEffect } from 'react';

// Development-only diagnostic for the "page renders but nothing responds to
// clicks" failure. Every modal surface in the app is a full-screen fixed layer
// (Base UI's own InternalBackdrop, plus each Dialog.Backdrop). If one of those
// outlives the dialog that owned it, it keeps swallowing every pointer event on
// the page while looking, at a glance, like the app has simply hung.
//
// This watches for exactly that shape — a viewport-sized fixed element that
// still accepts pointer events while no dialog is mounted — and reports it with
// enough detail to identify the owner. Renders nothing and is stripped from
// production builds.

const COVERAGE_RATIO = 0.9;
const SETTLE_MS = 250;

type Blocker = { element: Element; description: string };

function findBlockers(): Blocker[] {
    const blockers: Blocker[] = [];

    for (const element of document.querySelectorAll('body *')) {
        const style = getComputedStyle(element);
        if (style.position !== 'fixed' || style.pointerEvents === 'none') continue;
        if (style.display === 'none' || style.visibility === 'hidden') continue;

        const rect = element.getBoundingClientRect();
        const coversViewport = rect.width >= window.innerWidth * COVERAGE_RATIO && rect.height >= window.innerHeight * COVERAGE_RATIO;
        if (!coversViewport) continue;

        blockers.push({
            element,
            description: [
                element.tagName.toLowerCase(),
                element.className ? `class="${String(element.className)}"` : null,
                element.getAttribute('role') ? `role="${element.getAttribute('role')}"` : null,
                element.hasAttribute('data-base-ui-inert') ? 'data-base-ui-inert (Base UI InternalBackdrop)' : null,
                element.hasAttribute('data-closed') ? 'data-closed' : null,
                element.hasAttribute('data-open') ? 'data-open' : null,
                `opacity=${style.opacity}`,
                `z-index=${style.zIndex}`,
            ]
                .filter(Boolean)
                .join(' '),
        });
    }

    return blockers;
}

function report(trigger: string) {
    const blockers = findBlockers();
    if (blockers.length === 0) return;

    // A blocker while a dialog is genuinely mounted is the normal, correct
    // state. Only an orphan — no dialog anywhere in the DOM — is the bug.
    const hasDialog = document.querySelector('[role="dialog"], [role="alertdialog"]') !== null;
    if (hasDialog) return;

    console.error(
        `[OverlayLeakProbe] ${blockers.length} full-screen element(s) are still swallowing clicks after "${trigger}", but no dialog is mounted. ` +
            `This is the state where the app looks fine and nothing responds.`
    );
    for (const blocker of blockers) {
        console.error('[OverlayLeakProbe]  ->', blocker.description, blocker.element);
    }
}

export function OverlayLeakProbe() {
    useEffect(() => {
        if (process.env.NODE_ENV === 'production') return;

        let timeoutId: ReturnType<typeof setTimeout> | undefined;
        // The leak appears mid-teardown, so every check waits for the DOM to
        // stop changing rather than reporting a backdrop that is still on its
        // way out.
        function scheduleReport(trigger: string) {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => report(trigger), SETTLE_MS);
        }

        const observer = new MutationObserver(() => scheduleReport('dom change'));
        observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['style', 'class', 'inert'] });

        const onPopState = () => scheduleReport('browser back/forward');
        window.addEventListener('popstate', onPopState);

        // Manual escape hatch: run window.__overlayLeakCheck() from the console
        // the moment the app stops responding, whether or not the probe fired.
        (window as unknown as { __overlayLeakCheck?: () => Blocker[] }).__overlayLeakCheck = () => {
            const blockers = findBlockers();
            console.warn('[OverlayLeakProbe] full-screen click blockers:', blockers.length, blockers);
            return blockers;
        };

        return () => {
            clearTimeout(timeoutId);
            observer.disconnect();
            window.removeEventListener('popstate', onPopState);
            delete (window as unknown as { __overlayLeakCheck?: () => Blocker[] }).__overlayLeakCheck;
        };
    }, []);

    return null;
}
