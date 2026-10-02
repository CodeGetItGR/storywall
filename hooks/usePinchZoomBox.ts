'use client';

import { type CSSProperties, useEffect, useState } from 'react';

import { getPinchZoomBox } from '@/lib/visualViewport';

// Style for a fixed overlay that keeps its children at their normal on-screen
// size during a pinch zoom (see getPinchZoomBox). Undefined while unzoomed, so
// the overlay keeps its own classes.
export function usePinchZoomBox(): CSSProperties | undefined {
    const [style, setStyle] = useState<CSSProperties | undefined>(undefined);

    useEffect(() => {
        if (!window.visualViewport) return;

        const viewport: VisualViewport = window.visualViewport;
        let frame: number | null = null;

        function sync() {
            frame = null;
            const box = getPinchZoomBox(viewport);
            setStyle(box ? { inset: 'auto', top: 0, left: 0, transformOrigin: '0 0', ...box } : undefined);
        }

        function scheduleSync() {
            if (frame === null) frame = window.requestAnimationFrame(sync);
        }

        sync();
        viewport.addEventListener('resize', scheduleSync);
        viewport.addEventListener('scroll', scheduleSync);

        return () => {
            if (frame !== null) window.cancelAnimationFrame(frame);
            viewport.removeEventListener('resize', scheduleSync);
            viewport.removeEventListener('scroll', scheduleSync);
        };
    }, []);

    return style;
}
