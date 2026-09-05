'use client';

import type { SetupWorker } from 'msw/browser';

import { demoHandlers } from '@/lib/demo/mockHandlers';

// setupWorker() throws if it runs during SSR ("non-browser environment"), and this module
// is still evaluated server-side because Next.js imports client component modules during
// SSR too — so the worker is created lazily, on first use in the browser, not at module scope.
let worker: SetupWorker | null = null;
let startPromise: Promise<void> | null = null;

export function startDemoMocking(): Promise<void> {
    if (!startPromise) {
        startPromise = import('msw/browser').then(({ setupWorker }) => {
            worker ??= setupWorker(...demoHandlers);
            return worker
                .start({
                    onUnhandledRequest: 'error',
                    serviceWorker: { url: '/mockServiceWorker.js' },
                })
                .then(() => undefined);
        });
    }
    return startPromise;
}

export function stopDemoMocking(): void {
    startPromise = null;
    worker?.stop();
}
