'use client';

import type { RequestHandler } from 'msw';
import type { SetupWorker } from 'msw/browser';

// setupWorker() throws if it runs during SSR ("non-browser environment"), and this module
// is still evaluated server-side because Next.js imports client component modules during
// SSR too — so the worker is created lazily, on first use in the browser, not at module scope.
let worker: SetupWorker | null = null;
let startPromise: Promise<SetupWorker> | null = null;

// The worker keeps the tabs it mocks for in memory only. iOS Safari stops a backgrounded
// tab's service worker, and the restarted one has forgotten this tab, so it sends every
// request to the real backend: the demo's data fails to load (a blank post modal). Telling
// it again whenever the tab is back keeps the demo in this browser. Repeating it is harmless.
function reactivateMocking() {
    if (document.visibilityState !== 'visible') return;
    navigator.serviceWorker?.controller?.postMessage('MOCK_ACTIVATE');
}

function watchForResume() {
    document.addEventListener('visibilitychange', reactivateMocking);
    window.addEventListener('pageshow', reactivateMocking);
}

function stopWatchingForResume() {
    document.removeEventListener('visibilitychange', reactivateMocking);
    window.removeEventListener('pageshow', reactivateMocking);
}

// Starts interception (once) and makes `handlers` the complete handler set. Callers pass the
// session's handlers, which end in a catch-all that blocks every other backend call.
export async function startDemoMocking(handlers: RequestHandler[]): Promise<void> {
    if (!startPromise) {
        const starting: Promise<SetupWorker> = import('msw/browser').then(async ({ setupWorker }) => {
            worker ??= setupWorker();
            // Media files (presigned storage URLs), Next.js assets and fonts pass through untouched;
            // backend calls are covered by the handlers' own catch-all.
            await worker.start({ onUnhandledRequest: 'bypass', quiet: true, serviceWorker: { url: '/mockServiceWorker.js' } });
            // Not if the visitor left the demo meanwhile: it would turn mocking back on for the real app.
            if (startPromise === starting) watchForResume();
            return worker;
        });
        startPromise = starting;
    }
    const started = await startPromise;
    started.resetHandlers(...handlers);
}

export function stopDemoMocking(): void {
    startPromise = null;
    stopWatchingForResume();
    worker?.stop();
}
