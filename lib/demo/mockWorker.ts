'use client';

import type { RequestHandler } from 'msw';
import type { SetupWorker } from 'msw/browser';

const WORKER_URL = '/mockServiceWorker.js';
// Only demo pages are controlled by the worker. Registered at the root, it took over every page of
// the site once someone had opened the demo, and its passthrough re-sends each request with the
// headers copied: an EventSource's then counted as the page's own, and the feed stream failed CORS.
const WORKER_SCOPE = '/demo/';

// setupWorker() throws if it runs during SSR ("non-browser environment"), and this module
// is still evaluated server-side because Next.js imports client component modules during
// SSR too — so the worker is created lazily, on first use in the browser, not at module scope.
let worker: SetupWorker | null = null;
let startPromise: Promise<SetupWorker> | null = null;
// Bumped by every stop, so a stop still waiting on a start can tell whether a newer start owns the worker.
let stops = 0;

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
            // MSW reuses any registration of its script, so a site-wide one would keep its scope.
            await unregisterSiteWideDemoWorker();
            worker ??= setupWorker();
            // Media files (presigned storage URLs), Next.js assets and fonts pass through untouched;
            // backend calls are covered by the handlers' own catch-all.
            await worker.start({
                onUnhandledRequest: 'bypass',
                quiet: true,
                serviceWorker: { url: WORKER_URL, options: { scope: WORKER_SCOPE } },
            });
            // Not if the visitor left the demo meanwhile: it would turn mocking back on for the real app.
            if (startPromise === starting) watchForResume();
            return worker;
        });
        startPromise = starting;
    }
    const started = await startPromise;
    started.resetHandlers(...handlers);
}

// worker.stop() does nothing until worker.start() has finished, so leaving /demo while the worker
// is still starting waits for the start and stops it then. Otherwise the start would finish after
// the visitor had left and switch interception on for the real app.
export function stopDemoMocking(): void {
    const starting = startPromise;
    startPromise = null;
    stopWatchingForResume();
    stops += 1;
    const stop = stops;
    void starting?.then(
        (started) => {
            // The visitor came straight back: a newer start owns the same worker now.
            if (stop === stops && !startPromise) started.stop();
        },
        () => undefined,
    );
}

// Removes a demo worker registered for the whole site (every registration made before the scope
// above existed). Every page load calls it, so a visitor who once opened the demo is cleaned up.
export async function unregisterSiteWideDemoWorker(): Promise<void> {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
    try {
        const demoScope = new URL(WORKER_SCOPE, window.location.origin).href;
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(
            registrations
                .filter((registration) => registration.scope !== demoScope && isDemoWorker(registration))
                .map((registration) => registration.unregister()),
        );
    } catch {
        // Service workers unavailable (private mode, blocked storage): nothing was registered.
    }
}

function isDemoWorker(registration: ServiceWorkerRegistration): boolean {
    const scriptUrl = (registration.active ?? registration.waiting ?? registration.installing)?.scriptURL;
    return scriptUrl !== undefined && new URL(scriptUrl).pathname === WORKER_URL;
}
