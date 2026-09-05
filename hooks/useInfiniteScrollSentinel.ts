import { useEffect, useRef } from 'react';

// Observes a sentinel element and calls onLoadMore when it scrolls into view.
// itemCount forces the observer to re-attach as content grows, so newly
// revealed viewport space is re-checked immediately instead of waiting on
// the next scroll/resize event.
//
// isFetching (optional — omit for a query that can't overlap its own
// fetches) skips calling onLoadMore while a fetch for this query is already
// in flight. On a short list the sentinel can sit permanently in the
// viewport, and itemCount changing for any reason (e.g. an item appended
// outside pagination) re-triggers the observer's intersection callback —
// without this guard that stacks concurrent fetchNextPage calls.
export function useInfiniteScrollSentinel(hasNextPage: boolean | undefined, onLoadMore: () => void, itemCount: number, isFetching = false) {
    const sentinelRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const sentinel = sentinelRef.current;
        if (!sentinel || !hasNextPage) return;

        const observer = new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting && !isFetching) onLoadMore();
        });
        observer.observe(sentinel);
        return () => observer.disconnect();
    }, [hasNextPage, onLoadMore, itemCount, isFetching]);

    return sentinelRef;
}
