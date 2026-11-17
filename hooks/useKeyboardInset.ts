'use client';

import { useSyncExternalStore } from 'react';

import { getVisualViewportMetrics } from '@/lib/visualViewport';

function subscribe(onChange: () => void) {
    const viewport = window.visualViewport;
    viewport?.addEventListener('resize', onChange);
    viewport?.addEventListener('scroll', onChange);
    window.addEventListener('resize', onChange);
    return () => {
        viewport?.removeEventListener('resize', onChange);
        viewport?.removeEventListener('scroll', onChange);
        window.removeEventListener('resize', onChange);
    };
}

function snapshot(): number {
    const viewport = window.visualViewport;
    return viewport ? getVisualViewportMetrics(window.innerHeight, viewport, true).bottomInset : 0;
}

function serverSnapshot(): number {
    return 0;
}

// How much of the screen's bottom the on-screen keyboard covers, in px. 0 with no keyboard.
export function useKeyboardInset(): number {
    return useSyncExternalStore(subscribe, snapshot, serverSnapshot);
}
