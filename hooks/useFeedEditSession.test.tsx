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

const mocks = vi.hoisted(() => ({ put: vi.fn(), push: vi.fn(), overlay: vi.fn() }));

vi.mock('@/lib/api/client', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@/lib/api/client')>();
    return { ...actual, api: { ...actual.api, put: mocks.put } };
});
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: mocks.push }) }));
vi.mock('@/hooks/useOverlayHistory', () => ({
    useOverlayHistory: (open: boolean, onClose: () => void) => {
        mocks.overlay(open, onClose);
        return { requestClose: () => undefined };
    },
}));

function lastOverlay() {
    const [open, onClose] = mocks.overlay.mock.calls.at(-1) as [boolean, () => void];
    return { open, onClose };
}

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
    mocks.overlay.mockReset();
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
        // The layout is refetched meanwhile; the save still names the revision edit mode opened on.
        act(() => client.setQueryData(feedLayoutKeys.detail('e-1'), { ...saved, revision: 9 }));
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

    it('sends one save for a double tap', async () => {
        mocks.put.mockResolvedValue({ revision: 4, updatedAt: '2026-11-22T10:05:00Z' });
        const { result } = renderHook(() => useFeedEditSession(event, vi.fn()), { wrapper });
        hideRsvp(result.current);
        await act(async () => {
            await Promise.all([result.current.save(), result.current.save()]);
        });
        expect(mocks.put).toHaveBeenCalledTimes(1);
    });

    it('phone Back asks only with changes, and the layer is closed while a dialog shows', () => {
        const onDone = vi.fn();
        const { result } = renderHook(() => useFeedEditSession(event, onDone), { wrapper });
        expect(lastOverlay().open).toBe(true);
        act(() => lastOverlay().onClose());
        expect(onDone).toHaveBeenCalledOnce();
        expect(result.current.leaving).toBe(false);

        hideRsvp(result.current);
        act(() => lastOverlay().onClose());
        expect(result.current.leaving).toBe(true);
        expect(onDone).toHaveBeenCalledOnce();
        expect(lastOverlay().open).toBe(false);
        act(() => result.current.stay());
        expect(lastOverlay().open).toBe(true);
    });

    it('keeps the Back layer while saving, and Back does nothing until the save is in', async () => {
        let fail: (error: unknown) => void = () => undefined;
        mocks.put.mockReturnValueOnce(new Promise((_, reject) => (fail = reject)));
        const onDone = vi.fn();
        const { result } = renderHook(() => useFeedEditSession(event, onDone), { wrapper });
        hideRsvp(result.current);
        let saving: Promise<void> = Promise.resolve();
        act(() => {
            saving = result.current.save();
        });
        await waitFor(() => expect(result.current.saving).toBe(true));
        expect(lastOverlay().open).toBe(true);

        // Back took the layer's history entry: it is put straight back, and nothing else happens.
        const { onClose } = lastOverlay();
        mocks.overlay.mockClear();
        act(() => onClose());
        expect(onDone).not.toHaveBeenCalled();
        expect(result.current.leaving).toBe(false);
        await waitFor(() => expect(lastOverlay().open).toBe(true));
        expect(mocks.overlay.mock.calls.some(([open]) => open === false)).toBe(true);

        // A failed save keeps the edits on screen, still behind Back.
        await act(async () => {
            fail(new ApiError(500, { errorCode: 5004 }));
            await saving;
        });
        expect(result.current.failed).toBe(true);
        expect(result.current.dirty).toBe(true);
        expect(lastOverlay().open).toBe(true);
        act(() => lastOverlay().onClose());
        expect(result.current.leaving).toBe(true);
    });

    it('holds links while saving, without asking', async () => {
        let finish: (value: unknown) => void = () => undefined;
        mocks.put.mockReturnValueOnce(new Promise((resolve) => (finish = resolve)));
        const onDone = vi.fn();
        const { result } = renderHook(() => useFeedEditSession(event, onDone), { wrapper });
        hideRsvp(result.current);
        let saving: Promise<void> = Promise.resolve();
        act(() => {
            saving = result.current.save();
        });
        act(() => result.current.leaveTo('/events/e-1/manage'));
        expect(result.current.leaving).toBe(false);
        expect(mocks.push).not.toHaveBeenCalled();
        await act(async () => {
            finish({ revision: 4, updatedAt: '2026-11-22T10:05:00Z' });
            await saving;
        });
        expect(onDone).toHaveBeenCalledOnce();
        expect(result.current.leaving).toBe(false);
    });

    it('closes the Back layer while the conflict dialog shows', async () => {
        mocks.put.mockRejectedValue(new ApiError(409, { errorCode: 5208 }));
        const { result } = renderHook(() => useFeedEditSession(event, vi.fn()), { wrapper });
        hideRsvp(result.current);
        await act(() => result.current.save());
        expect(result.current.conflict).toBe(true);
        expect(lastOverlay().open).toBe(false);
    });
});
