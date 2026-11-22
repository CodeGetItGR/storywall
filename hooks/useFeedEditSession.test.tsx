import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useFeedEditSession } from '@/hooks/useFeedEditSession';
import { ApiError } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { EventDetailResponseDto, FeedLayoutDto } from '@/lib/api/types';
import { setFeedBlockVisible } from '@/lib/feedEditing';
import { defaultFeedLayout, feedLayoutKeys } from '@/lib/feedLayout';

const mocks = vi.hoisted(() => ({ put: vi.fn(), push: vi.fn() }));

vi.mock('@/lib/api/client', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@/lib/api/client')>();
    return { ...actual, api: { ...actual.api, put: mocks.put } };
});
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: mocks.push }) }));
vi.mock('@/hooks/useOverlayHistory', () => ({ useOverlayHistory: () => ({ requestClose: () => undefined }) }));

const event = { id: 'e-1', theme: null } as unknown as EventDetailResponseDto;
const saved: FeedLayoutDto = { themeSlug: null, revision: 3, document: defaultFeedLayout(), design: null, imageUrls: {}, updatedAt: '2026-11-22T10:00:00Z' };

let client: QueryClient;
function wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

beforeEach(() => {
    client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity }, mutations: { retry: false } } });
    client.setQueryData(feedLayoutKeys.detail('e-1'), saved);
    mocks.put.mockReset();
    mocks.push.mockReset();
});

function hideRsvp(session: ReturnType<typeof useFeedEditSession>) {
    act(() => session.store.getState().edit(setFeedBlockVisible('feed-feedRsvp', false)));
}

describe('useFeedEditSession', () => {
    it('is clean until something changes', () => {
        const { result } = renderHook(() => useFeedEditSession(event, vi.fn()), { wrapper });
        expect(result.current.dirty).toBe(false);
        hideRsvp(result.current);
        expect(result.current.dirty).toBe(true);
    });

    it('leaves at once on Cancel with nothing changed', () => {
        const onDone = vi.fn();
        const { result } = renderHook(() => useFeedEditSession(event, onDone), { wrapper });
        act(() => result.current.cancel());
        expect(onDone).toHaveBeenCalledOnce();
    });

    it('asks before Cancel drops changes, and stays on Stay', () => {
        const onDone = vi.fn();
        const { result } = renderHook(() => useFeedEditSession(event, onDone), { wrapper });
        hideRsvp(result.current);
        act(() => result.current.cancel());
        expect(result.current.leaving).toBe(true);
        expect(onDone).not.toHaveBeenCalled();
        act(() => result.current.stay());
        expect(result.current.leaving).toBe(false);
        act(() => result.current.cancel());
        act(() => result.current.leave());
        expect(onDone).toHaveBeenCalledOnce();
    });

    it('asks before following a link away, then goes there', () => {
        const onDone = vi.fn();
        const { result } = renderHook(() => useFeedEditSession(event, onDone), { wrapper });
        hideRsvp(result.current);
        act(() => result.current.leaveTo('/events/e-1/manage?tab=billing'));
        expect(mocks.push).not.toHaveBeenCalled();
        act(() => result.current.leave());
        expect(onDone).toHaveBeenCalledOnce();
        expect(mocks.push).toHaveBeenCalledWith('/events/e-1/manage?tab=billing');
    });

    it('saves with the revision it opened on, then leaves', async () => {
        mocks.put.mockResolvedValue({ revision: 4, updatedAt: '2026-11-22T10:05:00Z' });
        const onDone = vi.fn();
        const { result } = renderHook(() => useFeedEditSession(event, onDone), { wrapper });
        hideRsvp(result.current);
        await act(() => result.current.save());
        expect(mocks.put).toHaveBeenCalledWith(endpoints.events.feedLayout('e-1'), {
            revision: 3,
            themeSlug: null,
            document: result.current.store.getState().document,
        });
        expect(onDone).toHaveBeenCalledOnce();
    });

    it('just leaves on Save with nothing changed', async () => {
        const onDone = vi.fn();
        const { result } = renderHook(() => useFeedEditSession(event, onDone), { wrapper });
        await act(() => result.current.save());
        expect(mocks.put).not.toHaveBeenCalled();
        expect(onDone).toHaveBeenCalledOnce();
    });

    it('opens the conflict dialog on a stale revision, and reload leaves', async () => {
        mocks.put.mockRejectedValue(new ApiError(409, { errorCode: 5208 }));
        const onDone = vi.fn();
        const { result } = renderHook(() => useFeedEditSession(event, onDone), { wrapper });
        hideRsvp(result.current);
        await act(() => result.current.save());
        expect(result.current.conflict).toBe(true);
        expect(onDone).not.toHaveBeenCalled();
        const invalidate = vi.spyOn(client, 'invalidateQueries').mockResolvedValue();
        await act(() => result.current.reload());
        expect(invalidate).toHaveBeenCalledWith({ queryKey: feedLayoutKeys.detail('e-1') });
        expect(onDone).toHaveBeenCalledOnce();
    });

    it('stays and says so on any other failure', async () => {
        mocks.put.mockRejectedValue(new ApiError(500, { errorCode: 5004 }));
        const onDone = vi.fn();
        const { result } = renderHook(() => useFeedEditSession(event, onDone), { wrapper });
        hideRsvp(result.current);
        await act(() => result.current.save());
        await waitFor(() => expect(result.current.failed).toBe(true));
        expect(onDone).not.toHaveBeenCalled();
    });
});
