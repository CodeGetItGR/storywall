import { focusManager, onlineManager, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
    adminModerationKeys,
    useAdminModerationCase,
    useAdminModerationCases,
    useDecideModerationCase,
    useLiftEventBan,
    useStartModerationReview,
} from '@/hooks/useAdminModeration';
import { ApiError } from '@/lib/api/client';
import type { ModerationCaseStatus, ModerationDecisionRequestDto } from '@/lib/api/types';

const mocks = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), del: vi.fn() }));
vi.mock('@/lib/api/client', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@/lib/api/client')>()),
    api: {
        get: (...args: unknown[]) => mocks.get(...args),
        post: (...args: unknown[]) => mocks.post(...args),
        del: (...args: unknown[]) => mocks.del(...args),
    },
}));

const caseKey = adminModerationKeys.case('COMMENT', 'c-1');
const openKey = adminModerationKeys.cases('OPEN', 0);
const request: ModerationDecisionRequestDto = {
    outcome: 'DISMISSED',
    removeContent: false,
    removeMember: false,
    banFromEvent: false,
    suspendAccount: false,
    note: null,
};

// A client that would retry and refetch eagerly, so the hook's own options are what is under test.
function makeClient() {
    return new QueryClient({ defaultOptions: { queries: { retry: 3, retryDelay: 0, staleTime: 0 }, mutations: { retry: false } } });
}

function wrapperFor(client: QueryClient) {
    return function Wrapper({ children }: { children: React.ReactNode }) {
        return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
    };
}

function seed(client: QueryClient) {
    client.setQueryData(caseKey, { targetId: 'c-1' });
    client.setQueryData(openKey, { content: [] });
}

function isInvalidated(client: QueryClient, key: readonly unknown[]) {
    return client.getQueryState(key)?.isInvalidated ?? false;
}

beforeEach(() => {
    mocks.get.mockReset();
    mocks.post.mockReset();
    mocks.del.mockReset();
});

afterEach(() => {
    cleanup();
    focusManager.setFocused(undefined);
    onlineManager.setOnline(true);
});

describe('useAdminModerationCases', () => {
    it('reads one tab page', async () => {
        mocks.get.mockResolvedValue({ content: [], page: { size: 50, number: 1, totalElements: 0, totalPages: 0 } });
        const { result } = renderHook(() => useAdminModerationCases('UNDER_REVIEW', 1), { wrapper: wrapperFor(makeClient()) });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(mocks.get).toHaveBeenCalledWith('/api/admin/moderation/cases?status=UNDER_REVIEW&page=1&size=50');
    });

    it('keeps the previous page while paging, but never shows one tab under another', async () => {
        const pageOf = (label: string) => ({ content: [label], page: { size: 50, number: 0, totalElements: 1, totalPages: 2 } });
        let resolveNext: (value: unknown) => void = () => {};
        mocks.get.mockResolvedValueOnce(pageOf('open-0'));
        const { result, rerender } = renderHook(({ status, page }) => useAdminModerationCases(status, page), {
            wrapper: wrapperFor(makeClient()),
            initialProps: { status: 'OPEN' as ModerationCaseStatus, page: 0 },
        });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        mocks.get.mockReturnValueOnce(new Promise((resolve) => (resolveNext = resolve)));
        rerender({ status: 'OPEN', page: 1 });
        expect(result.current.data?.content).toEqual(['open-0']);
        expect(result.current.isPlaceholderData).toBe(true);
        await act(async () => resolveNext(pageOf('open-1')));
        await waitFor(() => expect(result.current.data?.content).toEqual(['open-1']));

        mocks.get.mockReturnValueOnce(new Promise(() => {}));
        rerender({ status: 'CLOSED', page: 0 });
        expect(result.current.data).toBeUndefined();
        expect(result.current.isLoading).toBe(true);
    });
});

describe('useAdminModerationCase', () => {
    // Invalidated first, so only the focus/reconnect flags stand between the events and a refetch.
    it('does not refetch an open case on focus or reconnect: every fetch is an audited view', async () => {
        mocks.get.mockResolvedValue({ targetId: 'c-1' });
        const client = makeClient();
        const { result } = renderHook(() => useAdminModerationCase('COMMENT', 'c-1'), { wrapper: wrapperFor(client) });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(mocks.get).toHaveBeenCalledWith('/api/admin/moderation/cases/COMMENT/c-1');

        await act(() => client.invalidateQueries({ queryKey: caseKey, refetchType: 'none' }));
        act(() => {
            focusManager.setFocused(false);
            focusManager.setFocused(true);
            onlineManager.setOnline(false);
            onlineManager.setOnline(true);
        });
        await new Promise((resolve) => setTimeout(resolve, 20));

        expect(mocks.get).toHaveBeenCalledTimes(1);
    });

    it('fetches once per opening: a closed case is not served from cache', async () => {
        mocks.get.mockResolvedValue({ targetId: 'c-1' });
        const client = makeClient();
        const first = renderHook(() => useAdminModerationCase('COMMENT', 'c-1'), { wrapper: wrapperFor(client) });
        await waitFor(() => expect(first.result.current.isSuccess).toBe(true));
        first.unmount();
        await new Promise((resolve) => setTimeout(resolve, 20));

        const second = renderHook(() => useAdminModerationCase('COMMENT', 'c-1'), { wrapper: wrapperFor(client) });
        await waitFor(() => expect(second.result.current.isSuccess).toBe(true));

        expect(mocks.get).toHaveBeenCalledTimes(2);
    });

    it('does not retry a failed fetch', async () => {
        mocks.get.mockRejectedValue(new ApiError(404, { errorCode: 2001 }));
        const { result } = renderHook(() => useAdminModerationCase('COMMENT', 'missing'), { wrapper: wrapperFor(makeClient()) });
        await waitFor(() => expect(result.current.isError).toBe(true));
        expect(mocks.get).toHaveBeenCalledTimes(1);
    });
});

describe('useStartModerationReview', () => {
    it('moves the case between tabs without re-reading the case', async () => {
        mocks.post.mockResolvedValue(null);
        const client = makeClient();
        seed(client);
        const { result } = renderHook(() => useStartModerationReview(), { wrapper: wrapperFor(client) });

        await act(() => result.current.mutateAsync({ targetType: 'COMMENT', targetId: 'c-1' }));

        expect(mocks.post).toHaveBeenCalledWith('/api/admin/moderation/cases/COMMENT/c-1/review');
        expect(isInvalidated(client, openKey)).toBe(true);
        expect(isInvalidated(client, caseKey)).toBe(false);
    });

    it('refreshes the queue and the case when another admin closed it (5106)', async () => {
        mocks.post.mockRejectedValue(new ApiError(409, { errorCode: 5106 }));
        const client = makeClient();
        seed(client);
        const { result } = renderHook(() => useStartModerationReview(), { wrapper: wrapperFor(client) });

        await act(() => result.current.mutateAsync({ targetType: 'COMMENT', targetId: 'c-1' }).catch(() => undefined));

        expect(isInvalidated(client, openKey)).toBe(true);
        expect(isInvalidated(client, caseKey)).toBe(true);
    });
});

describe('useDecideModerationCase', () => {
    it('posts the decision and refreshes the queue and the case', async () => {
        mocks.post.mockResolvedValue({ id: 'd-1' });
        const client = makeClient();
        seed(client);
        const { result } = renderHook(() => useDecideModerationCase(), { wrapper: wrapperFor(client) });

        await act(() => result.current.mutateAsync({ targetType: 'COMMENT', targetId: 'c-1', request }));

        expect(mocks.post).toHaveBeenCalledWith('/api/admin/moderation/cases/COMMENT/c-1/decision', request);
        expect(isInvalidated(client, openKey)).toBe(true);
        expect(isInvalidated(client, caseKey)).toBe(true);
    });

    it('does not re-read a mounted case after deciding (the drawer closes; a re-read is a logged view)', async () => {
        mocks.get.mockResolvedValue({ targetId: 'c-1' });
        mocks.post.mockResolvedValue({ id: 'd-1' });
        const client = makeClient();
        const { result } = renderHook(() => [useAdminModerationCase('COMMENT', 'c-1'), useDecideModerationCase()] as const, {
            wrapper: wrapperFor(client),
        });
        await waitFor(() => expect(result.current[0].isSuccess).toBe(true));

        await act(() => result.current[1].mutateAsync({ targetType: 'COMMENT', targetId: 'c-1', request }));
        await new Promise((resolve) => setTimeout(resolve, 20));

        expect(mocks.get).toHaveBeenCalledTimes(1);
        expect(isInvalidated(client, caseKey)).toBe(true);
    });

    it('refreshes the queue and the case when another admin decided first (5106)', async () => {
        mocks.post.mockRejectedValue(new ApiError(409, { errorCode: 5106 }));
        const client = makeClient();
        seed(client);
        const { result } = renderHook(() => useDecideModerationCase(), { wrapper: wrapperFor(client) });

        await act(() => result.current.mutateAsync({ targetType: 'COMMENT', targetId: 'c-1', request }).catch(() => undefined));

        expect(isInvalidated(client, openKey)).toBe(true);
        expect(isInvalidated(client, caseKey)).toBe(true);
    });

    it.each([3039, 5107, 5108])('re-reads only the case after a refusal (%i)', async (errorCode) => {
        mocks.post.mockRejectedValue(new ApiError(errorCode === 3039 ? 400 : 409, { errorCode }));
        const client = makeClient();
        seed(client);
        const { result } = renderHook(() => useDecideModerationCase(), { wrapper: wrapperFor(client) });

        await act(() => result.current.mutateAsync({ targetType: 'COMMENT', targetId: 'c-1', request }).catch(() => undefined));

        expect(isInvalidated(client, caseKey)).toBe(true);
        expect(isInvalidated(client, openKey)).toBe(false);
    });

    it('leaves the caches alone on an unrelated failure', async () => {
        mocks.post.mockRejectedValue(new ApiError(500, {}));
        const client = makeClient();
        seed(client);
        const { result } = renderHook(() => useDecideModerationCase(), { wrapper: wrapperFor(client) });

        await act(() => result.current.mutateAsync({ targetType: 'COMMENT', targetId: 'c-1', request }).catch(() => undefined));

        expect(isInvalidated(client, caseKey)).toBe(false);
        expect(isInvalidated(client, openKey)).toBe(false);
    });
});

describe('useLiftEventBan', () => {
    it('lifts the ban and re-reads the case', async () => {
        mocks.del.mockResolvedValue(null);
        const client = makeClient();
        seed(client);
        const { result } = renderHook(() => useLiftEventBan(), { wrapper: wrapperFor(client) });

        await act(() => result.current.mutateAsync({ banId: 'b-1', targetType: 'COMMENT', targetId: 'c-1' }));

        expect(mocks.del).toHaveBeenCalledWith('/api/admin/moderation/bans/b-1');
        expect(isInvalidated(client, caseKey)).toBe(true);
        expect(isInvalidated(client, openKey)).toBe(false);
    });

    it('treats a 404 as already lifted', async () => {
        mocks.del.mockRejectedValue(new ApiError(404, { errorCode: 2001 }));
        const client = makeClient();
        seed(client);
        const { result } = renderHook(() => useLiftEventBan(), { wrapper: wrapperFor(client) });

        await act(() => result.current.mutateAsync({ banId: 'b-1', targetType: 'COMMENT', targetId: 'c-1' }));

        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(isInvalidated(client, caseKey)).toBe(true);
    });

    it('still fails on other errors', async () => {
        mocks.del.mockRejectedValue(new ApiError(403, { errorCode: 4013 }));
        const { result } = renderHook(() => useLiftEventBan(), { wrapper: wrapperFor(makeClient()) });

        await expect(act(() => result.current.mutateAsync({ banId: 'b-1', targetType: 'COMMENT', targetId: 'c-1' }))).rejects.toBeInstanceOf(
            ApiError,
        );
    });
});
