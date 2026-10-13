'use client';

import { useEffect, useState } from 'react';

import { runWhenIdle } from '@/lib/utils';

const IDLE_TIMEOUT_MS = 2000;

/**
 * Whether lazily loaded UI should be mounted: at once when it's `needed`, or once the browser
 * is idle after it became `likely`. It stays true from then on, so the UI can still animate
 * closed and its code is only requested once.
 */
export function useDeferredMount({ likely, needed }: { likely: boolean; needed: boolean }): boolean {
    const [wasNeeded, setWasNeeded] = useState(needed);
    const [isIdleReady, setIsIdleReady] = useState(false);
    if (needed && !wasNeeded) setWasNeeded(true);

    useEffect(() => {
        if (!likely || isIdleReady) return;
        return runWhenIdle(() => setIsIdleReady(true), IDLE_TIMEOUT_MS);
    }, [likely, isIdleReady]);

    return wasNeeded || isIdleReady;
}
