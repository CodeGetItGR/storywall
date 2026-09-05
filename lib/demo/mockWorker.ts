'use client';

import { setupWorker } from 'msw/browser';

import { demoHandlers } from '@/lib/demo/mockHandlers';

// A module-level singleton — setupWorker() must only be called once per page, even if
// app/demo/layout.tsx's effect re-runs (React StrictMode double-invokes effects in dev).
const worker = setupWorker(...demoHandlers);
let startPromise: Promise<void> | null = null;

export function startDemoMocking(): Promise<void> {
    if (!startPromise) {
        startPromise = worker
            .start({
                onUnhandledRequest: 'error',
                serviceWorker: { url: '/mockServiceWorker.js' },
            })
            .then(() => undefined);
    }
    return startPromise;
}

export function stopDemoMocking(): void {
    startPromise = null;
    worker.stop();
}
