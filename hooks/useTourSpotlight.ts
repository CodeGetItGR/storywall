'use client';

import { useEffect, useState } from 'react';

import type { TourRect } from '@/lib/invitation/editorTour';

// The first match that is on screen, or else the first match.
function findTarget(selector: string): HTMLElement | null {
    const matches = Array.from(document.querySelectorAll<HTMLElement>(selector));
    return (
        matches.find((element) => {
            const box = element.getBoundingClientRect();
            return box.width > 0 && box.height > 0 && getComputedStyle(element).visibility !== 'hidden';
        }) ??
        matches[0] ??
        null
    );
}

function reducedMotion(): boolean {
    return typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

// Brings the part a tour step points at into view and follows where it is on screen.
export function useTourSpotlight(selector: string | null): TourRect | null {
    const [measured, setMeasured] = useState<{ selector: string; rect: TourRect } | null>(null);

    useEffect(() => {
        if (!selector) return;
        const target = findTarget(selector);
        if (!target) return;
        target.scrollIntoView({ block: 'center', inline: 'nearest', behavior: reducedMotion() ? 'auto' : 'smooth' });

        let frame = 0;
        const measure = () => {
            cancelAnimationFrame(frame);
            frame = requestAnimationFrame(() => {
                const box = target.getBoundingClientRect();
                setMeasured({ selector, rect: { left: box.left, top: box.top, width: box.width, height: box.height } });
            });
        };
        measure();
        // Scrolling (the smooth scroll above too) and resizing move the part.
        window.addEventListener('resize', measure);
        window.addEventListener('scroll', measure, true);
        return () => {
            cancelAnimationFrame(frame);
            window.removeEventListener('resize', measure);
            window.removeEventListener('scroll', measure, true);
        };
    }, [selector]);

    return measured && measured.selector === selector ? measured.rect : null;
}
