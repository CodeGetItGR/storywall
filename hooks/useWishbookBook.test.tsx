import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { bookRefetchInterval, useRequestWishbookBook, useSetWishHighlighted, useWishbookBook, wishbookBookKeys } from '@/hooks/useWishbookBook';
import { wishbookKeys } from '@/hooks/useWishbook';
import { ApiError } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';

const apiGet = vi.fn();
const apiPost = vi.fn();
const apiPut = vi.fn();
const apiDel = vi.fn();
vi.mock('@/lib/api/client', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@/lib/api/client')>()),
    api: {
        get: (...a: unknown[]) => apiGet(...a),
        post: (...a: unknown[]) => apiPost(...a),
        put: (...a: unknown[]) => apiPut(...a),
        del: (...a: unknown[]) => apiDel(...a),
    },
}));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ isAuthenticated: true }) }));
vi.mock('@/hooks/useModuleReadable', () => ({ useModuleReadable: () => true }));

function wrapperFor(client: QueryClient) {
    return function Wrapper({ children }: { children: React.ReactNode }) {
        return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
    };
}

describe('useWishbookBook', () => {
    let client: QueryClient;
    beforeEach(() => {
        client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
        apiGet.mockReset();
        apiPost.mockReset();
        apiPut.mockReset();
        apiDel.mockReset();
    });

    it('reads a never-built book (404) as null', async () => {
        apiGet.mockRejectedValue(new ApiError(404, { errorCode: 2001 }));
        const { result } = renderHook(() => useWishbookBook('e1', true), { wrapper: wrapperFor(client) });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data).toBeNull();
    });

    it('does not read the book for a non-host', () => {
        renderHook(() => useWishbookBook('e1', false), { wrapper: wrapperFor(client) });
        expect(apiGet).not.toHaveBeenCalled();
    });

    it('polls only while a build is waiting or running', () => {
        expect(bookRefetchInterval({ status: 'QUEUED' } as never)).toBe(3000);
        expect(bookRefetchInterval({ status: 'RUNNING' } as never)).toBe(3000);
        expect(bookRefetchInterval({ status: 'READY' } as never)).toBe(false);
        expect(bookRefetchInterval({ status: 'FAILED' } as never)).toBe(false);
        expect(bookRefetchInterval(null)).toBe(false);
    });

    it('a request writes the returned build into the cache', async () => {
        apiPost.mockResolvedValue({ status: 'QUEUED', requestedAt: 'x' });
        const { result } = renderHook(() => useRequestWishbookBook('e1'), { wrapper: wrapperFor(client) });
        await act(() => result.current.mutateAsync());
        expect(apiPost).toHaveBeenCalledWith(endpoints.events.wishbookBook('e1'));
        expect(client.getQueryData(wishbookBookKeys.book('e1'))).toEqual({ status: 'QUEUED', requestedAt: 'x' });
    });

    it('starring PUTs, unstarring DELETEs', async () => {
        apiPut.mockResolvedValue(undefined);
        apiDel.mockResolvedValue(undefined);
        const { result } = renderHook(() => useSetWishHighlighted('e1'), { wrapper: wrapperFor(client) });
        await act(() => result.current.mutateAsync({ entryId: 'w1', highlighted: true }));
        await act(() => result.current.mutateAsync({ entryId: 'w1', highlighted: false }));
        expect(apiPut).toHaveBeenCalledWith(endpoints.wishbook.highlight('w1'));
        expect(apiDel).toHaveBeenCalledWith(endpoints.wishbook.highlight('w1'));
    });

    it('stars the cached wish at once and puts it back when the request fails', async () => {
        const entry = (id: string, highlighted: boolean) => ({ id, highlighted });
        client.setQueryData(wishbookKeys.list('e1'), {
            pageParams: [0],
            pages: [{ content: [entry('w1', false), entry('w2', false)], page: { size: 20, number: 0, totalElements: 2, totalPages: 1 } }],
        });
        let release: (error: Error) => void = () => undefined;
        apiPut.mockReturnValue(new Promise((_resolve, reject) => (release = reject)));
        const { result } = renderHook(() => useSetWishHighlighted('e1'), { wrapper: wrapperFor(client) });

        const pending = act(() => result.current.mutateAsync({ entryId: 'w1', highlighted: true }).catch(() => undefined));
        const starredIds = () =>
            (client.getQueryData(wishbookKeys.list('e1')) as { pages: { content: { id: string; highlighted: boolean }[] }[] }).pages[0].content
                .filter((wish) => wish.highlighted)
                .map((wish) => wish.id);
        await waitFor(() => expect(starredIds()).toEqual(['w1']));

        release(new ApiError(500, null));
        await pending;
        await waitFor(() => expect(starredIds()).toEqual([]));
    });
});
