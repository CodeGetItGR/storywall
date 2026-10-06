import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { wishbookKeys } from '@/hooks/useWishbook';
import {
    bookRefetchInterval,
    useRequestWishbookBook,
    useSetWishHighlighted,
    useWishbookBook,
    useWishbookBookTexts,
    wishbookBookKeys,
} from '@/hooks/useWishbookBook';
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
const authState = { isAuthenticated: true };
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => authState }));
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
        authState.isAuthenticated = true;
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

    it('stops polling once a refetch fails, instead of hammering a broken endpoint on the cached QUEUED', async () => {
        vi.useFakeTimers();
        try {
            apiGet.mockResolvedValueOnce({ status: 'QUEUED', requestedAt: 'x' }).mockRejectedValue(new ApiError(500, null));
            renderHook(() => useWishbookBook('e1', true), { wrapper: wrapperFor(client) });
            await vi.advanceTimersByTimeAsync(0);
            expect(apiGet).toHaveBeenCalledTimes(1);

            await vi.advanceTimersByTimeAsync(3000);
            expect(apiGet).toHaveBeenCalledTimes(2);
            expect(client.getQueryState(wishbookBookKeys.book('e1'))?.status).toBe('error');

            await vi.advanceTimersByTimeAsync(30_000);
            expect(apiGet).toHaveBeenCalledTimes(2);
        } finally {
            vi.useRealTimers();
        }
    });

    it('reads the book again on every mount, however fresh the cache is', async () => {
        client.setDefaultOptions({ queries: { retry: false, staleTime: 10 * 60_000 } });
        apiGet.mockResolvedValue({ status: 'READY', requestedAt: 'x' });
        const first = renderHook(() => useWishbookBook('e1', true), { wrapper: wrapperFor(client) });
        await waitFor(() => expect(first.result.current.isSuccess).toBe(true));
        first.unmount();
        renderHook(() => useWishbookBook('e1', true), { wrapper: wrapperFor(client) });
        await waitFor(() => expect(apiGet).toHaveBeenCalledTimes(2));
    });

    it('reads the book texts again on every mount, and not before sign-in', async () => {
        client.setDefaultOptions({ queries: { retry: false, staleTime: 10 * 60_000 } });
        apiGet.mockResolvedValue({ subtitle: null, defaults: {} });
        authState.isAuthenticated = false;
        const signedOut = renderHook(() => useWishbookBookTexts('e1', true), { wrapper: wrapperFor(client) });
        expect(apiGet).not.toHaveBeenCalled();
        signedOut.unmount();

        authState.isAuthenticated = true;
        const first = renderHook(() => useWishbookBookTexts('e1', true), { wrapper: wrapperFor(client) });
        await waitFor(() => expect(first.result.current.isSuccess).toBe(true));
        first.unmount();
        renderHook(() => useWishbookBookTexts('e1', true), { wrapper: wrapperFor(client) });
        await waitFor(() => expect(apiGet).toHaveBeenCalledTimes(2));
    });

    it('a request cancels an in-flight read so a stale answer cannot overwrite the new build', async () => {
        let resolveRead: (book: unknown) => void = () => undefined;
        apiGet.mockReturnValue(new Promise((resolve) => (resolveRead = resolve)));
        renderHook(() => useWishbookBook('e1', true), { wrapper: wrapperFor(client) });
        await waitFor(() => expect(apiGet).toHaveBeenCalledTimes(1));

        apiPost.mockResolvedValue({ status: 'QUEUED', requestedAt: 'new' });
        const { result } = renderHook(() => useRequestWishbookBook('e1'), { wrapper: wrapperFor(client) });
        await act(() => result.current.mutateAsync());
        resolveRead({ status: 'READY', requestedAt: 'old' });
        await act(async () => {
            await Promise.resolve();
        });

        expect(client.getQueryData(wishbookBookKeys.book('e1'))).toEqual({ status: 'QUEUED', requestedAt: 'new' });
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

    it('a failed star puts back only its own wish and leaves a later one that succeeded', async () => {
        const page = { size: 20, number: 0, totalElements: 2, totalPages: 1 };
        client.setQueryData(wishbookKeys.list('e1'), {
            pageParams: [0],
            pages: [{ content: [{ id: 'w1', highlighted: false }, { id: 'w2', highlighted: false }], page }],
        });
        let failA: (error: Error) => void = () => undefined;
        let finishB: () => void = () => undefined;
        apiPut.mockImplementation((path: string) =>
            path === endpoints.wishbook.highlight('w1')
                ? new Promise((_resolve, reject) => (failA = reject))
                : new Promise<void>((resolve) => (finishB = resolve)),
        );
        const invalidate = vi.spyOn(client, 'invalidateQueries');
        const { result } = renderHook(() => useSetWishHighlighted('e1'), { wrapper: wrapperFor(client) });
        const starredIds = () =>
            (client.getQueryData(wishbookKeys.list('e1')) as { pages: { content: { id: string; highlighted: boolean }[] }[] }).pages[0].content
                .filter((wish) => wish.highlighted)
                .map((wish) => wish.id);

        let pendingA: Promise<unknown> = Promise.resolve();
        let pendingB: Promise<unknown> = Promise.resolve();
        await act(async () => {
            pendingA = result.current.mutateAsync({ entryId: 'w1', highlighted: true }).catch(() => undefined);
            pendingB = result.current.mutateAsync({ entryId: 'w2', highlighted: true });
        });
        await waitFor(() => expect(starredIds()).toEqual(['w1', 'w2']));

        await act(async () => {
            failA(new ApiError(500, null));
            await pendingA;
        });
        expect(starredIds()).toEqual(['w2']);
        // B is still in flight, so the list is not refetched yet (a refetch now could still miss B).
        expect(invalidate).not.toHaveBeenCalled();

        await act(async () => {
            finishB();
            await pendingB;
        });
        expect(starredIds()).toEqual(['w2']);
        expect(invalidate).toHaveBeenCalledTimes(1);
        expect(invalidate).toHaveBeenCalledWith({ queryKey: wishbookKeys.list('e1'), exact: true });
    });
});
