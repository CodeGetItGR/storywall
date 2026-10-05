import { act, cleanup, render } from '@testing-library/react';
import React from 'react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

import { useInfiniteScrollSentinel } from '@/hooks/useInfiniteScrollSentinel';

// The feed's sentinel can mount after its data (behind a loading state), and a
// load can be cancelled or add nothing. Either way the sentinel, still in view,
// must ask again rather than stay idle until the reader scrolls away and back.

let observed: Element[] = [];

class FakeIntersectionObserver {
    constructor(private readonly callback: IntersectionObserverCallback) {}
    observe(target: Element) {
        observed.push(target);
        // Like the real one: reports the target's current state once on observe. Always in view here.
        this.callback([{ isIntersecting: true, target } as IntersectionObserverEntry], this as unknown as IntersectionObserver);
    }
    disconnect() {}
}

beforeEach(() => {
    observed = [];
    vi.stubGlobal('IntersectionObserver', FakeIntersectionObserver);
});

afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
});

type Props = { showSentinel: boolean; isFetching: boolean; onLoadMore: () => void };

function List({ showSentinel, isFetching, onLoadMore }: Props) {
    const ref = useInfiniteScrollSentinel(true, onLoadMore, 20, isFetching);
    return showSentinel ? <div ref={ref} /> : null;
}

it('observes a sentinel that mounts after the data', () => {
    const onLoadMore = vi.fn();
    const { rerender } = render(<List showSentinel={false} isFetching={false} onLoadMore={onLoadMore} />);
    expect(onLoadMore).not.toHaveBeenCalled();

    rerender(<List showSentinel isFetching={false} onLoadMore={onLoadMore} />);

    expect(observed).toHaveLength(1);
    expect(onLoadMore).toHaveBeenCalledTimes(1);
});

it('waits out a fetch, then asks again while still in view', () => {
    const onLoadMore = vi.fn();
    const { rerender } = render(<List showSentinel isFetching onLoadMore={onLoadMore} />);
    expect(onLoadMore).not.toHaveBeenCalled();

    // The fetch settled without changing the item count or hasNextPage.
    act(() => rerender(<List showSentinel isFetching={false} onLoadMore={onLoadMore} />));

    expect(onLoadMore).toHaveBeenCalledTimes(1);
});
