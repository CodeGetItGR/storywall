import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { usePlaylistLive } from '@/hooks/usePlaylistLive';

const patch = vi.fn();
const invalidate = vi.fn();
const leaderboard = vi.hoisted(() => ({ calls: [] as unknown[][], data: [] as unknown[] }));
const eventState = vi.hoisted(() => ({ event: undefined as unknown }));
vi.mock('@/lib/api/client', () => ({ api: { patch: (...a: unknown[]) => patch(...a) } }));
vi.mock('@tanstack/react-query', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@tanstack/react-query')>()),
    useQueryClient: () => ({ invalidateQueries: invalidate }),
}));
vi.mock('@/hooks/usePlaylist', () => ({
    playlistKeys: { leaderboard: (eventId: string) => ['events', eventId, 'playlist-suggestions', 'leaderboard'] },
    usePlaylistLeaderboard: (...args: unknown[]) => {
        leaderboard.calls.push(args);
        return { data: leaderboard.data, isLoading: false, isError: false };
    },
}));
vi.mock('@/hooks/useEvent', () => ({ useEvent: () => ({ data: eventState.event }) }));
vi.mock('@/hooks/useApiErrorMessage', () => ({ useApiErrorMessage: () => () => 'failed' }));

// useMutation needs a provider; invalidations go to the mocked useQueryClient above.
function TestWrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={new QueryClient({ defaultOptions: { mutations: { retry: false } } })}>{children}</QueryClientProvider>;
}

const LIVE_EVENT = {
    status: 'ACTIVE',
    deletedAt: null,
    modules: [{ moduleKey: 'playlist', isEnabled: true, isAvailable: true, configuration: {} }],
};

beforeEach(() => {
    patch.mockReset();
    invalidate.mockReset();
    leaderboard.calls = [];
    eventState.event = LIVE_EVENT;
    leaderboard.data = [
        { id: 's1', title: 'One', rank: 1, playedAt: null },
        { id: 's2', title: 'Two', rank: 2, playedAt: '2027-07-12T21:00:00Z' },
    ];
});

describe('usePlaylistLive', () => {
    it('polls the leaderboard and keeps the server order', () => {
        const { result } = renderHook(() => usePlaylistLive('e1'), { wrapper: TestWrapper });
        expect(leaderboard.calls[0]).toEqual(['e1', true, { refetchInterval: 15_000 }]);
        expect(result.current.rows.map((row) => row.id)).toEqual(['s1', 's2']);
    });

    it('marks a song played and not played, then refreshes the list', async () => {
        patch.mockResolvedValue({});
        const { result } = renderHook(() => usePlaylistLive('e1'), { wrapper: TestWrapper });
        await act(() => result.current.togglePlayed(leaderboard.data[0] as never));
        expect(patch).toHaveBeenCalledWith('/api/events/e1/playlist-suggestions/s1/played', { played: true });
        await act(() => result.current.togglePlayed(leaderboard.data[1] as never));
        expect(patch).toHaveBeenLastCalledWith('/api/events/e1/playlist-suggestions/s2/played', { played: false });
        expect(invalidate).toHaveBeenCalledWith({ queryKey: ['events', 'e1', 'playlist-suggestions', 'leaderboard'] });
    });

    it('shows the error when the mark fails', async () => {
        patch.mockRejectedValue(new Error('403'));
        const { result } = renderHook(() => usePlaylistLive('e1'), { wrapper: TestWrapper });
        await act(() => result.current.togglePlayed(leaderboard.data[0] as never));
        expect(result.current.error).toBe('failed');
    });

    it('allows marking only while the event is live with the playlist available', () => {
        const { result, rerender } = renderHook(() => usePlaylistLive('e1'), { wrapper: TestWrapper });
        expect(result.current.canMark).toBe(true);
        eventState.event = { ...LIVE_EVENT, status: 'DRAFT' };
        rerender();
        expect(result.current.canMark).toBe(false);
    });
});
