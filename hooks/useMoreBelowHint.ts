'use client';

import { type RefObject, useEffect, useState } from 'react';

// Whether to point at content that starts below the first screen (KAN-213): true while the target is
// still under the bottom edge. Once the guest has seen it, the hint stays gone.
export function useMoreBelowHint(target: RefObject<HTMLElement | null>, enabled: boolean) {
    const [isBelow, setIsBelow] = useState(false);
    const [hasSeen, setHasSeen] = useState(false);

    useEffect(() => {
        const element = target.current;
        if (!enabled || !element || typeof IntersectionObserver === 'undefined') return;

        const observer = new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting) {
                setHasSeen(true);
                setIsBelow(false);
                return;
            }
            const viewportBottom = entry.rootBounds?.bottom ?? window.innerHeight;
            setIsBelow(entry.boundingClientRect.top >= viewportBottom);
        });
        observer.observe(element);
        return () => observer.disconnect();
    }, [target, enabled]);

    function reveal() {
        const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
        target.current?.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
    }

    return { isVisible: enabled && isBelow && !hasSeen, reveal };
}
