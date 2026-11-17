'use client';

import { type RefObject, useEffect, useState } from 'react';

// How far above the bottom edge the target has to come before it counts as seen.
export const SEEN_MARGIN_PX = 80;

// Whether to point at content that starts below the first screen (KAN-213): true while the target is
// still under the bottom edge. Once the guest has seen it, the hint stays gone.
export function useMoreBelowHint(target: RefObject<HTMLElement | null>, enabled: boolean) {
    const [isBelow, setIsBelow] = useState(false);
    const [hasSeen, setHasSeen] = useState(false);

    useEffect(() => {
        const element = target.current;
        if (!enabled || !element || typeof IntersectionObserver === 'undefined') return;

        // The bottom band, where the hint itself sits, doesn't count as seen: a heading peeking in
        // behind the hint would otherwise hide it before any choice is in view.
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setHasSeen(true);
                    setIsBelow(false);
                    return;
                }
                const visibleBottom = entry.rootBounds?.bottom ?? window.innerHeight - SEEN_MARGIN_PX;
                setIsBelow(entry.boundingClientRect.top >= visibleBottom);
            },
            { rootMargin: `0px 0px -${SEEN_MARGIN_PX}px 0px` },
        );
        observer.observe(element);
        return () => observer.disconnect();
    }, [target, enabled]);

    function reveal() {
        const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
        target.current?.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
    }

    return { isVisible: enabled && isBelow && !hasSeen, reveal };
}
