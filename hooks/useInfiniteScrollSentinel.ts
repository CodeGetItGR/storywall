import { type RefCallback, useEffect, useState } from 'react';

// Observes a sentinel element and calls onLoadMore when it scrolls into view.
// itemCount forces the observer to re-attach as content grows, so newly
// revealed viewport space is re-checked immediately instead of waiting on
// the next scroll/resize event.
//
// The returned ref is a callback ref, so a sentinel that mounts after the
// list's data (behind a loading state) or is replaced still gets observed.
//
// isFetching (optional — omit for a query that can't overlap its own
// fetches) skips calling onLoadMore while a fetch for this query is already
// in flight, and re-checks the sentinel once that fetch settles. On a short
// list the sentinel can sit permanently in the viewport, and itemCount
// changing for any reason (e.g. an item appended outside pagination)
// re-triggers the observer's intersection callback — without this guard that
// stacks concurrent fetchNextPage calls. A load that was cancelled or added
// nothing changes neither itemCount nor hasNextPage, so without the re-check
// a sentinel still in view would never ask again.
export function useInfiniteScrollSentinel(
    hasNextPage: boolean | undefined,
    onLoadMore: () => void,
    itemCount: number,
    isFetching = false,
): RefCallback<HTMLDivElement> {
    const [sentinel, setSentinel] = useState<HTMLDivElement | null>(null);

    useEffect(() => {
        if (!sentinel || !hasNextPage || isFetching) return;

        const observer = new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting) onLoadMore();
        });
        observer.observe(sentinel);
        return () => observer.disconnect();
    }, [sentinel, hasNextPage, onLoadMore, itemCount, isFetching]);

    return setSentinel;
}
