'use client';

import type { RequestHandler } from 'msw';
import type { SetupWorker } from 'msw/browser';

// setupWorker() throws if it runs during SSR ("non-browser environment"), and this module
// is still evaluated server-side because Next.js imports client component modules during
// SSR too — so the worker is created lazily, on first use in the browser, not at module scope.
let worker: SetupWorker | null = null;
let startPromise: Promise<SetupWorker> | null = null;

// Starts interception (once) and makes `handlers` the complete handler set. Callers pass the
// session's handlers, which end in a catch-all that blocks every other backend call.
export async function startDemoMocking(handlers: RequestHandler[]): Promise<void> {
    if (!startPromise) {
        startPromise = import('msw/browser').then(async ({ setupWorker }) => {
            worker ??= setupWorker();
            // Media files (presigned storage URLs), Next.js assets and fonts pass through untouched;
            // backend calls are covered by the handlers' own catch-all.
            await worker.start({ onUnhandledRequest: 'bypass', quiet: true, serviceWorker: { url: '/mockServiceWorker.js' } });
            return worker;
        });
    }
    const started = await startPromise;
    started.resetHandlers(...handlers);
}

export function stopDemoMocking(): void {
    startPromise = null;
    worker?.stop();
}
