'use client';

import { type RefObject, useEffect } from 'react';

// Marks every `.occasion-reveal` inside the root as visible once it scrolls into view.
export function useOccasionReveal(rootRef: RefObject<HTMLElement | null>) {
    useEffect(() => {
        const root = rootRef.current;
        if (!root) return;
        const targets = [...root.querySelectorAll<HTMLElement>('.occasion-reveal')];
        if (!('IntersectionObserver' in window)) {
            targets.forEach((target) => (target.dataset.visible = 'true'));
            return;
        }
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (!entry.isIntersecting) return;
                    (entry.target as HTMLElement).dataset.visible = 'true';
                    observer.unobserve(entry.target);
                });
            },
            { rootMargin: '0px 0px -10% 0px', threshold: 0.15 },
        );
        targets.forEach((target) => observer.observe(target));
        return () => observer.disconnect();
    }, [rootRef]);
}
