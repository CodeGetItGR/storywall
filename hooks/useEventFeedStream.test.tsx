import { type InfiniteData, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useEventFeedStream } from '@/hooks/useEventFeedStream';
import { ApiError } from '@/lib/api/client';
import type { Page } from '@/lib/api/pagination';
import type { PostResponseDto } from '@/lib/api/types';
import { postKeys } from '@/lib/postQueries';

const apiPost = vi.fn();
const apiGet = vi.fn();
vi.mock('@/lib/api/client', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@/lib/api/client')>();
    return {
        ...actual,
        api: { ...actual.api, post: (...a: unknown[]) => apiPost(...a), get: (...a: unknown[]) => apiGet(...a), url: (p: string) => p },
    };
});

class FakeEventSource {
    static instances: FakeEventSource[] = [];
    listeners: Record<string, Array<() => void>> = {};
    closed = false;
    constructor(public url: string) {
        FakeEventSource.instances.push(this);
    }
    addEventListener(name: string, fn: () => void) {
        (this.listeners[name] ??= []).push(fn);
    }
    close() {
        this.closed = true;
    }
    emit(name: string) {
        for (const fn of this.listeners[name] ?? []) fn();
    }
}

function wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider>;
}

async function flush() {
    await act(async () => {
        await Promise.resolve();
        await Promise.resolve();
    });
}

beforeEach(() => {
    vi.useFakeTimers();
    apiPost.mockReset();
    apiGet.mockReset();
    FakeEventSource.instances = [];
    vi.stubGlobal('EventSource', FakeEventSource);
});

afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
});

describe('useEventFeedStream', () => {
    it('opens a stream with a freshly minted token', async () => {
        apiPost.mockResolvedValue({ token: 't1', expiresInMs: 60_000 });
        renderHook(() => useEventFeedStream('event-1'), { wrapper });
        await flush();
        expect(apiPost).toHaveBeenCalledTimes(1);
        expect(FakeEventSource.instances[0].url).toContain('token=t1');
    });

    it('re-mints a token and reopens after a stream error', async () => {
        apiPost.mockResolvedValueOnce({ token: 't1' }).mockResolvedValueOnce({ token: 't2' });
        renderHook(() => useEventFeedStream('event-1'), { wrapper });
        await flush();
        act(() => FakeEventSource.instances[0].emit('error'));
        expect(FakeEventSource.instances[0].closed).toBe(true);
        await act(async () => {
            await vi.advanceTimersByTimeAsync(1_000);
        });
        await flush();
        expect(apiPost).toHaveBeenCalledTimes(2);
        expect(FakeEventSource.instances[1].url).toContain('token=t2');
    });

    it.each([401, 403, 404])('stops retrying when minting a token fails with %i', async (status) => {
        apiPost.mockRejectedValue(new ApiError(status, null));
        renderHook(() => useEventFeedStream('event-1'), { wrapper });
        await flush();
        await act(async () => {
            await vi.advanceTimersByTimeAsync(60_000);
        });
        expect(apiPost).toHaveBeenCalledTimes(1);
        expect(FakeEventSource.instances).toHaveLength(0);
    });

    it('backs off exponentially on transient mint failures', async () => {
        apiPost.mockRejectedValue(new TypeError('network down'));
        renderHook(() => useEventFeedStream('event-1'), { wrapper });
        await flush();
        expect(apiPost).toHaveBeenCalledTimes(1);

        await act(async () => {
            await vi.advanceTimersByTimeAsync(1_000);
        });
        expect(apiPost).toHaveBeenCalledTimes(2);

        await act(async () => {
            await vi.advanceTimersByTimeAsync(1_000);
        });
        expect(apiPost).toHaveBeenCalledTimes(2);
        await act(async () => {
            await vi.advanceTimersByTimeAsync(1_000);
        });
        expect(apiPost).toHaveBeenCalledTimes(3);

        await act(async () => {
            await vi.advanceTimersByTimeAsync(3_000);
        });
        expect(apiPost).toHaveBeenCalledTimes(3);
        await act(async () => {
            await vi.advanceTimersByTimeAsync(1_000);
        });
        expect(apiPost).toHaveBeenCalledTimes(4);
    });

    it('resets the backoff once a stream opens successfully', async () => {
        apiPost
            .mockRejectedValueOnce(new TypeError('network down'))
            .mockRejectedValueOnce(new TypeError('network down'))
            .mockResolvedValue({ token: 'ok' });
        renderHook(() => useEventFeedStream('event-1'), { wrapper });
        await flush();
        await act(async () => {
            await vi.advanceTimersByTimeAsync(1_000);
        });
        await act(async () => {
            await vi.advanceTimersByTimeAsync(2_000);
        });
        await flush();
        expect(FakeEventSource.instances).toHaveLength(1);

        act(() => FakeEventSource.instances[0].emit('error'));
        await act(async () => {
            await vi.advanceTimersByTimeAsync(1_000);
        });
        await flush();
        expect(FakeEventSource.instances).toHaveLength(2);
    });

    it('honours Retry-After on 429', async () => {
        apiPost.mockRejectedValueOnce(new ApiError(429, { errorCode: 'RATE_LIMITED', retryAfterSeconds: 7 })).mockResolvedValue({ token: 'ok' });
        renderHook(() => useEventFeedStream('event-1'), { wrapper });
        await flush();
        await act(async () => {
            await vi.advanceTimersByTimeAsync(6_900);
        });
        expect(apiPost).toHaveBeenCalledTimes(1);
        await act(async () => {
            await vi.advanceTimersByTimeAsync(200);
        });
        expect(apiPost).toHaveBeenCalledTimes(2);
    });

    it('closes the stream and cancels pending reconnects on unmount', async () => {
        apiPost.mockResolvedValue({ token: 't1' });
        const { unmount } = renderHook(() => useEventFeedStream('event-1'), { wrapper });
        await flush();
        act(() => FakeEventSource.instances[0].emit('error'));
        unmount();
        await act(async () => {
            await vi.advanceTimersByTimeAsync(60_000);
        });
        expect(apiPost).toHaveBeenCalledTimes(1);
    });
});

describe('useEventFeedStream on a change', () => {
    function page(number: number, ids: string[]): Page<PostResponseDto> {
        return { content: ids.map((id) => ({ id }) as PostResponseDto), page: { number, size: 2, totalElements: 7, totalPages: 4 } };
    }

    async function renderWithFeed(...pages: Page<PostResponseDto>[]) {
        const client = new QueryClient();
        client.setQueryData<InfiniteData<Page<PostResponseDto>>>(postKeys.list('event-1'), {
            pages,
            pageParams: pages.map((item) => item.page.number),
        });
        apiPost.mockResolvedValue({ token: 't1' });
        renderHook(() => useEventFeedStream('event-1'), {
            wrapper: ({ children }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>,
        });
        await flush();
        return client;
    }

    // Every change moves every page's ETag, so refetching the whole list costs
    // one full download per loaded page, per guest, per change.
    it('fetches only the first page when several are loaded', async () => {
        const client = await renderWithFeed(page(0, ['a', 'b']), page(1, ['c', 'd']), page(2, ['e', 'f']));
        apiGet.mockResolvedValue(page(0, ['new', 'a']));

        act(() => FakeEventSource.instances[0].emit('changed'));
        await act(async () => {
            await vi.advanceTimersByTimeAsync(1_500);
        });

        expect(apiGet).toHaveBeenCalledTimes(1);
        expect(apiGet.mock.calls[0][0]).toContain('page=0');
        const pages = client.getQueryData<InfiniteData<Page<PostResponseDto>>>(postKeys.list('event-1'))!.pages;
        expect(pages.map((item) => item.content.map((post) => post.id))).toEqual([
            ['new', 'a'],
            ['b', 'c', 'd'],
            ['e', 'f'],
        ]);
    });

    it("waits a random moment first, so an event's guests do not all fetch at once", async () => {
        vi.spyOn(Math, 'random').mockReturnValue(0.5);
        await renderWithFeed(page(0, ['a', 'b']), page(1, ['c', 'd']));
        apiGet.mockResolvedValue(page(0, ['a', 'b']));

        act(() => FakeEventSource.instances[0].emit('changed'));
        await act(async () => {
            await vi.advanceTimersByTimeAsync(700);
        });
        expect(apiGet).not.toHaveBeenCalled();

        await act(async () => {
            await vi.advanceTimersByTimeAsync(100);
        });
        expect(apiGet).toHaveBeenCalledTimes(1);
        vi.mocked(Math.random).mockRestore();
    });

    it('covers frames that arrive while a refresh is waiting with that one refresh', async () => {
        await renderWithFeed(page(0, ['a', 'b']), page(1, ['c', 'd']));
        apiGet.mockResolvedValue(page(0, ['a', 'b']));

        act(() => {
            FakeEventSource.instances[0].emit('changed');
            FakeEventSource.instances[0].emit('changed');
            FakeEventSource.instances[0].emit('changed');
        });
        await act(async () => {
            await vi.advanceTimersByTimeAsync(1_500);
        });

        expect(apiGet).toHaveBeenCalledTimes(1);
    });

    it('does not refresh after unmount', async () => {
        const client = new QueryClient();
        client.setQueryData(postKeys.list('event-1'), { pages: [page(0, ['a']), page(1, ['b'])], pageParams: [0, 1] });
        apiPost.mockResolvedValue({ token: 't1' });
        const { unmount } = renderHook(() => useEventFeedStream('event-1'), {
            wrapper: ({ children }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>,
        });
        await flush();

        act(() => FakeEventSource.instances[0].emit('changed'));
        unmount();
        await act(async () => {
            await vi.advanceTimersByTimeAsync(1_500);
        });

        expect(apiGet).not.toHaveBeenCalled();
    });
});
