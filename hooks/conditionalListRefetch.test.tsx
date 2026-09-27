import { type InfiniteData, QueryClient, QueryClientProvider, type UseInfiniteQueryResult } from '@tanstack/react-query';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { commentKeys, usePostComments } from '@/hooks/useComments';
import { useEventPosts } from '@/hooks/usePosts';
import { postKeys } from '@/lib/postQueries';

// The feed and comment lists send If-None-Match and answer a 304 with the page
// they already hold. If that page is gone from the cache while the hook still
// remembers its ETag, the 304 has nothing to stand for: the list must ask again
// without the ETag rather than resolve to undefined.

vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ isAuthenticated: true }) }));
vi.mock('@/hooks/useModuleReadable', () => ({ useModuleReadable: () => true }));

const conditionalGet = vi.fn();
vi.mock('@/lib/api/client', () => ({
    api: { conditionalGet: (...a: unknown[]) => conditionalGet(...a) },
}));

const PAGE = { content: [{ id: 'x' }], page: { number: 0, size: 20, totalElements: 1, totalPages: 1 } };

let client: QueryClient;
function wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

beforeEach(() => {
    client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    conditionalGet.mockReset();
    // Honour If-None-Match the way the backend does: a matching ETag gets a 304.
    conditionalGet.mockImplementation(async (_path: string, options?: RequestInit) => {
        const sent = (options?.headers as Record<string, string> | undefined)?.['If-None-Match'];
        return sent === 'e1' ? { notModified: true } : { data: PAGE, etag: 'e1', notModified: false };
    });
});

afterEach(cleanup);

type ListCase = { name: string; useList: () => UseInfiniteQueryResult<InfiniteData<unknown>>; key: readonly string[] };

describe.each<ListCase>([
    { name: 'feed', useList: () => useEventPosts('event-1'), key: postKeys.list('event-1') },
    { name: 'comments', useList: () => usePostComments('post-1'), key: commentKeys.list('post-1') },
])('$name list', ({ useList, key }) => {
    it('refetches without its ETag when a 304 arrives for a page no longer cached', async () => {
        const { result } = renderHook(useList, { wrapper });
        await waitFor(() => expect(result.current.data?.pages[0]).toEqual(PAGE));

        await act(() => client.resetQueries({ queryKey: key }));

        await waitFor(() => expect(result.current.isFetching).toBe(false));
        expect(result.current.isError).toBe(false);
        expect(result.current.data?.pages[0]).toEqual(PAGE);
    });
});
