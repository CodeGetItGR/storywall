import { useEffect, useRef } from 'react';

// Observes a sentinel element and calls onLoadMore when it scrolls into view.
// itemCount forces the observer to re-attach as content grows, so newly
// revealed viewport space is re-checked immediately instead of waiting on
// the next scroll/resize event.
export function useInfiniteScrollSentinel(hasNextPage: boolean | undefined, onLoadMore: () => void, itemCount: number) {
    const sentinelRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const sentinel = sentinelRef.current;
        if (!sentinel || !hasNextPage) return;

        const observer = new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting) onLoadMore();
        });
        observer.observe(sentinel);
        return () => observer.disconnect();
    }, [hasNextPage, onLoadMore, itemCount]);

    return sentinelRef;
}
