import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useFeedEditMode } from '@/hooks/useFeedEditMode';
import type { EventDetailResponseDto } from '@/lib/api/types';
import { feedLayoutKeys } from '@/lib/feedLayout';
import { FeedEditorFlagProvider } from '@/providers/FeedEditorFlagProvider';

// A layout that never arrives, for "until the layout is in".
const mocks = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock('@/lib/api/client', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@/lib/api/client')>();
    return { ...actual, api: { ...actual.api, get: mocks.get } };
});
beforeEach(() => {
    mocks.get.mockReset();
    mocks.get.mockImplementation(() => new Promise(() => undefined));
});

const SAVE_MY_DATE = [{ moduleKey: 'save_my_date', isAvailable: true, isEnabled: true }];
const active = { id: 'e-1', theme: null, status: 'ACTIVE', modules: SAVE_MY_DATE } as unknown as EventDetailResponseDto;

function wrap(
    { flag = true, loaded = true }: { flag?: boolean; loaded?: boolean } = {},
    client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } }),
) {
    if (loaded) client.setQueryData(feedLayoutKeys.detail('e-1'), null);
    return function Wrapper({ children }: { children: ReactNode }) {
        return (
            <QueryClientProvider client={client}>
                <FeedEditorFlagProvider enabled={flag}>{children}</FeedEditorFlagProvider>
            </QueryClientProvider>
        );
    };
}

describe('useFeedEditMode', () => {
    it('lets a host start and finish editing', () => {
        const { result } = renderHook(() => useFeedEditMode(active, true), { wrapper: wrap() });
        expect(result.current.canEdit).toBe(true);
        act(() => result.current.start());
        expect(result.current.editing).toBe(true);
        act(() => result.current.finish());
        expect(result.current.editing).toBe(false);
    });

    it('is off for a guest, with the flag off, on a read-only event and until the layout is in', () => {
        expect(renderHook(() => useFeedEditMode(active, false), { wrapper: wrap() }).result.current.canEdit).toBe(false);
        expect(renderHook(() => useFeedEditMode(active, true), { wrapper: wrap({ flag: false }) }).result.current.canEdit).toBe(false);
        const readOnly = { ...active, status: 'ENDED' } as unknown as EventDetailResponseDto;
        expect(renderHook(() => useFeedEditMode(readOnly, true), { wrapper: wrap() }).result.current.canEdit).toBe(false);
        expect(renderHook(() => useFeedEditMode(active, true), { wrapper: wrap({ loaded: false }) }).result.current.canEdit).toBe(false);
    });

    it('drops edit mode for good when editing stops being allowed', () => {
        const { result, rerender } = renderHook(({ isHost }) => useFeedEditMode(active, isHost), { wrapper: wrap(), initialProps: { isHost: true } });
        act(() => result.current.start());
        rerender({ isHost: false });
        expect(result.current.editing).toBe(false);
        rerender({ isHost: true });
        expect(result.current.canEdit).toBe(true);
        expect(result.current.editing).toBe(false);
    });

    it('stays in edit mode when a later refetch fails', async () => {
        const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
        const { result } = renderHook(() => useFeedEditMode(active, true), { wrapper: wrap({}, client) });
        act(() => result.current.start());
        mocks.get.mockRejectedValue(new Error('offline'));
        await act(() => client.invalidateQueries({ queryKey: feedLayoutKeys.detail('e-1') }));
        await waitFor(() => expect(client.getQueryState(feedLayoutKeys.detail('e-1'))?.status).toBe('error'));
        expect(result.current.canEdit).toBe(true);
        expect(result.current.editing).toBe(true);
    });

    it('opens on every feed plan, for the feed sections only without Save my date', () => {
        const without = { ...active, modules: [] } as unknown as EventDetailResponseDto;
        expect(renderHook(() => useFeedEditMode(without, true), { wrapper: wrap() }).result.current).toMatchObject({
            canEdit: true,
            scope: 'feedSections',
        });
        expect(renderHook(() => useFeedEditMode(active, true), { wrapper: wrap() }).result.current.scope).toBe('all');
    });

    it('is settled once the role and the layout are known', () => {
        expect(renderHook(() => useFeedEditMode(active, true, true), { wrapper: wrap() }).result.current.settled).toBe(false);
        expect(renderHook(() => useFeedEditMode(active, true), { wrapper: wrap({ loaded: false }) }).result.current.settled).toBe(false);
        expect(renderHook(() => useFeedEditMode(active, true), { wrapper: wrap() }).result.current.settled).toBe(true);
        expect(renderHook(() => useFeedEditMode(active, false), { wrapper: wrap({ flag: false, loaded: false }) }).result.current.settled).toBe(true);
    });
});
