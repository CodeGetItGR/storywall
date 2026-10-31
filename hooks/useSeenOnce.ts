'use client';

import { useEffect, useRef } from 'react';

import { POST_VIEW_DWELL_MS, POST_VIEW_RATIO } from '@/hooks/useVendorPostViewTracking';

// Attach the returned ref to an element. Calls onSeen once, the first time at least half of it stays
// on screen for a second: the same "seen" as a vendor's post.
export function useSeenOnce<T extends Element>(onSeen: () => void, enabled: boolean) {
    const ref = useRef<T | null>(null);

    useEffect(() => {
        const element = ref.current;
        if (!enabled || !element || typeof IntersectionObserver === 'undefined') return;
        let timer: number | null = null;
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting && entry.intersectionRatio >= POST_VIEW_RATIO) {
                    timer ??= window.setTimeout(() => {
                        onSeen();
                        observer.disconnect();
                    }, POST_VIEW_DWELL_MS);
                } else if (timer !== null) {
                    window.clearTimeout(timer);
                    timer = null;
                }
            },
            { threshold: [POST_VIEW_RATIO] },
        );
        observer.observe(element);
        return () => {
            observer.disconnect();
            if (timer !== null) window.clearTimeout(timer);
        };
    }, [enabled, onSeen]);

    return ref;
}
