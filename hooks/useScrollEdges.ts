'use client';

import { useEffect, useState } from 'react';

// Tracks whether a sideways-scrolling element has more content past its left and right edges. Pass track as the
// element's ref: a callback, so an element that mounts later (after its data loads) is still tracked.
export function useScrollEdges<T extends HTMLElement>() {
    const [element, track] = useState<T | null>(null);
    const [edges, setEdges] = useState({ before: false, after: false });

    useEffect(() => {
        if (!element) return;
        const update = () => {
            const max = element.scrollWidth - element.clientWidth;
            const before = element.scrollLeft > 1;
            const after = element.scrollLeft < max - 1;
            setEdges((current) => (current.before === before && current.after === after ? current : { before, after }));
        };
        update();
        element.addEventListener('scroll', update, { passive: true });
        const observer = new ResizeObserver(update);
        observer.observe(element);
        return () => {
            element.removeEventListener('scroll', update);
            observer.disconnect();
        };
    }, [element]);

    return { track, ...edges };
}
