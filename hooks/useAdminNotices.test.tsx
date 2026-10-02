import { focusManager, onlineManager, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { adminModerationKeys } from '@/hooks/useAdminModeration';
import {
    adminNoticeKeys,
    useAdminNotice,
    useAdminNotices,
    useAttachNotice,
    useCloseNotice,
    useNoticeEventSearch,
    useNoticeItems,
} from '@/hooks/useAdminNotices';
import { ApiError } from '@/lib/api/client';

const mocks = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));
vi.mock('@/lib/api/client', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@/lib/api/client')>()),
    api: {
        get: (...args: unknown[]) => mocks.get(...args),
        post: (...args: unknown[]) => mocks.post(...args),
    },
}));

const page = (size: number) => ({ content: [], page: { size, number: 0, totalElements: 0, totalPages: 0 } });
const noFilters = { q: '', hostEmail: '', date: '' };

// A client that would retry and refetch eagerly, so the hook's own options are what is under test.
function makeClient() {
    return new QueryClient({ defaultOptions: { queries: { retry: 3, retryDelay: 0, staleTime: 0 }, mutations: { retry: false } } });
}

function wrapperFor(client: QueryClient) {
    return function Wrapper({ children }: { children: React.ReactNode }) {
        return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
    };
}

function isInvalidated(client: QueryClient, key: readonly unknown[]) {
    return client.getQueryState(key)?.isInvalidated ?? false;
}

beforeEach(() => {
    mocks.get.mockReset();
    mocks.post.mockReset();
});

afterEach(() => {
    cleanup();
    focusManager.setFocused(undefined);
    onlineManager.setOnline(true);
});

describe('useAdminNotices', () => {
    it('lists a view with page and size', async () => {
        mocks.get.mockResolvedValue(page(50));
        renderHook(() => useAdminNotices('CLOSED', 2), { wrapper: wrapperFor(makeClient()) });
        await waitFor(() => expect(mocks.get).toHaveBeenCalledWith('/api/admin/moderation/notices?status=CLOSED&page=2&size=50'));
    });
});

describe('useAdminNotice', () => {
    it('fetches a notice once per opening: no retry and no refetch on focus', async () => {
        mocks.get.mockRejectedValueOnce(new Error('boom'));
        const { result } = renderHook(() => useAdminNotice('n-1'), { wrapper: wrapperFor(makeClient()) });
        await waitFor(() => expect(result.current.isError).toBe(true));
        act(() => focusManager.setFocused(true));
        expect(mocks.get).toHaveBeenCalledTimes(1);
    });
});

describe('useNoticeItems', () => {
    it('fetches items only for the type asked for, once', async () => {
        mocks.get.mockResolvedValue(page(30));
        const { result } = renderHook(() => useNoticeItems('n-1', 'e-1', 'POST', 0), { wrapper: wrapperFor(makeClient()) });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        act(() => focusManager.setFocused(true));
        expect(mocks.get).toHaveBeenCalledTimes(1);
        expect(mocks.get).toHaveBeenCalledWith('/api/admin/moderation/notices/n-1/events/e-1/items?type=POST&page=0&size=30');
    });

    it('does not refetch page 0 when the admin pages on and comes back', async () => {
        mocks.get.mockResolvedValue(page(30));
        const { result, rerender } = renderHook(({ p }) => useNoticeItems('n-1', 'e-1', 'POST', p), {
            wrapper: wrapperFor(makeClient()),
            initialProps: { p: 0 },
        });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        rerender({ p: 1 });
        await waitFor(() => expect(mocks.get).toHaveBeenCalledTimes(2));
        rerender({ p: 0 });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(mocks.get).toHaveBeenCalledTimes(2);
    });
});

describe('useNoticeEventSearch', () => {
    it('does not search until a filter is given', () => {
        renderHook(() => useNoticeEventSearch('n-1', noFilters), { wrapper: wrapperFor(makeClient()) });
        renderHook(() => useNoticeEventSearch('n-1', { q: '   ', hostEmail: ' ', date: '' }), { wrapper: wrapperFor(makeClient()) });
        expect(mocks.get).not.toHaveBeenCalled();
    });

    it('sends only the filled filters, trimmed and capped', async () => {
        mocks.get.mockResolvedValue(page(20));
        const { result } = renderHook(() => useNoticeEventSearch('n-1', { q: ` ${'a'.repeat(250)} `, hostEmail: '', date: '2026-10-01' }, 1), {
            wrapper: wrapperFor(makeClient()),
        });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(mocks.get).toHaveBeenCalledWith(`/api/admin/moderation/notices/n-1/events?page=1&size=20&q=${'a'.repeat(200)}&date=2026-10-01`);
    });
});

describe('useAttachNotice', () => {
    const variables = { id: 'n-1', eventId: 'e-1', targetType: 'POST' as const, targetId: 'p-1' };

    it('posts the body, writes the detail into the cache and refreshes both queues', async () => {
        const detail = { id: 'n-1', status: 'ATTACHED' };
        mocks.post.mockResolvedValue(detail);
        const client = makeClient();
        client.setQueryData(adminNoticeKeys.list('NEW', 0), page(50));
        client.setQueryData(adminModerationKeys.cases('OPEN', 0), page(50));
        client.setQueryData(adminNoticeKeys.items('n-1', 'e-1', 'POST', 0), page(30));
        const { result } = renderHook(() => useAttachNotice(), { wrapper: wrapperFor(client) });
        await act(async () => {
            await result.current.mutateAsync(variables);
        });
        expect(mocks.post).toHaveBeenCalledWith('/api/admin/moderation/notices/n-1/attach', { eventId: 'e-1', targetType: 'POST', targetId: 'p-1' });
        expect(client.getQueryData(adminNoticeKeys.notice('n-1'))).toEqual(detail);
        expect(isInvalidated(client, adminNoticeKeys.list('NEW', 0))).toBe(true);
        expect(isInvalidated(client, adminModerationKeys.cases('OPEN', 0))).toBe(true);
        expect(client.getQueryData(adminNoticeKeys.items('n-1', 'e-1', 'POST', 0))).toBeUndefined();
    });

    it('on 5109 refreshes the notice and the lists', async () => {
        mocks.post.mockRejectedValue(new ApiError(409, { errorCode: 5109 }));
        const client = makeClient();
        client.setQueryData(adminNoticeKeys.list('NEW', 0), page(50));
        client.setQueryData(adminNoticeKeys.notice('n-1'), { id: 'n-1' });
        const { result } = renderHook(() => useAttachNotice(), { wrapper: wrapperFor(client) });
        await act(async () => {
            await result.current.mutateAsync(variables).catch(() => {});
        });
        expect(isInvalidated(client, adminNoticeKeys.list('NEW', 0))).toBe(true);
        expect(isInvalidated(client, adminNoticeKeys.notice('n-1'))).toBe(true);
    });

    it('leaves the queries alone on other failures', async () => {
        mocks.post.mockRejectedValue(new ApiError(404, { errorCode: 2001 }));
        const client = makeClient();
        client.setQueryData(adminNoticeKeys.list('NEW', 0), page(50));
        const { result } = renderHook(() => useAttachNotice(), { wrapper: wrapperFor(client) });
        await act(async () => {
            await result.current.mutateAsync(variables).catch(() => {});
        });
        expect(isInvalidated(client, adminNoticeKeys.list('NEW', 0))).toBe(false);
    });
});

describe('useCloseNotice', () => {
    it('posts the reason and note, caches the detail and refreshes the lists', async () => {
        const detail = { id: 'n-1', status: 'CLOSED' };
        mocks.post.mockResolvedValue(detail);
        const client = makeClient();
        client.setQueryData(adminNoticeKeys.list('CLOSED', 0), page(50));
        const { result } = renderHook(() => useCloseNotice(), { wrapper: wrapperFor(client) });
        await act(async () => {
            await result.current.mutateAsync({ id: 'n-1', reason: 'SPAM', note: null });
        });
        expect(mocks.post).toHaveBeenCalledWith('/api/admin/moderation/notices/n-1/close', { reason: 'SPAM', note: null });
        expect(client.getQueryData(adminNoticeKeys.notice('n-1'))).toEqual(detail);
        expect(isInvalidated(client, adminNoticeKeys.list('CLOSED', 0))).toBe(true);
    });

    it('on 5109 refreshes the notice and the lists', async () => {
        mocks.post.mockRejectedValue(new ApiError(409, { errorCode: 5109 }));
        const client = makeClient();
        client.setQueryData(adminNoticeKeys.list('NEW', 0), page(50));
        client.setQueryData(adminNoticeKeys.notice('n-1'), { id: 'n-1' });
        const { result } = renderHook(() => useCloseNotice(), { wrapper: wrapperFor(client) });
        await act(async () => {
            await result.current.mutateAsync({ id: 'n-1', reason: 'NO_BREACH', note: 'x' }).catch(() => {});
        });
        expect(isInvalidated(client, adminNoticeKeys.list('NEW', 0))).toBe(true);
        expect(isInvalidated(client, adminNoticeKeys.notice('n-1'))).toBe(true);
    });
});
