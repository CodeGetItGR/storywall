import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

import { postKeys, refreshFeedFirstPage, useEventPosts } from '@/hooks/usePosts';

// A post created while the reader is loading the feed's next page refreshes the
// feed. That refresh must not cancel the next page and drop the feed back to
// its first page, or the posts on the next page vanish until the reader scrolls
// away and back.

vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ isAuthenticated: true }) }));
vi.mock('@/hooks/useModuleReadable', () => ({ useModuleReadable: () => true }));

function page(number: number) {
    const ids = Array.from({ length: number === 0 ? 20 : 3 }, (_, i) => `post-${number}-${i}`);
    return { content: ids.map((id) => ({ id })), page: { number, size: 20, totalElements: 23, totalPages: 2 } };
}

const conditionalGet = vi.fn();
vi.mock('@/lib/api/client', () => ({
    api: { conditionalGet: (...a: unknown[]) => conditionalGet(...a) },
}));

let client: QueryClient;
function wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

beforeEach(() => {
    client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    conditionalGet.mockReset();
    conditionalGet.mockImplementation(async (path: string) => {
        const number = Number(new URL(path, 'http://x').searchParams.get('page'));
        // The next page is slow, so the refresh starts while it is in flight.
        await new Promise((resolve) => setTimeout(resolve, number === 1 ? 300 : 5));
        return { data: page(number), etag: null, notModified: false };
    });
});

afterEach(cleanup);

it('keeps the next page when the feed refreshes while it loads', async () => {
    const { result } = renderHook(() => useEventPosts('event-1'), { wrapper });
    await waitFor(() => expect(result.current.data?.pages).toHaveLength(1));

    act(() => void result.current.fetchNextPage());
    expect(client.getQueryState(postKeys.list('event-1'))?.fetchStatus).toBe('fetching');
    await act(() => refreshFeedFirstPage(client, 'event-1'));
    await waitFor(() => expect(result.current.isFetching).toBe(false));

    expect(result.current.data?.pages.map((p) => p.page.number)).toEqual([0, 1]);
    expect(result.current.hasNextPage).toBe(false);
});
