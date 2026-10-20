'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useState } from 'react';

import { useApiErrorMessage } from '@/hooks/useApiErrorMessage';
import { useEvent } from '@/hooks/useEvent';
import { playlistKeys, usePlaylistLeaderboard } from '@/hooks/usePlaylist';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { PlaylistSuggestionLeaderboardDto } from '@/lib/api/types';
import { canMarkSongsPlayed } from '@/lib/eventLifecycle';

// Guests keep voting during the party, so the DJ's list refreshes on its own.
export const PLAYLIST_LIVE_REFRESH_MS = 15_000;

// The DJ's live list: the leaderboard in rank order and the played mark.
export function usePlaylistLive(eventId: string) {
    const toErrorMessage = useApiErrorMessage();
    const queryClient = useQueryClient();
    const { data: event } = useEvent(eventId);
    const leaderboard = usePlaylistLeaderboard(eventId, true, { refetchInterval: PLAYLIST_LIVE_REFRESH_MS });
    const [error, setError] = useState<string | null>(null);

    const markPlayed = useMutation({
        mutationFn: ({ id, played }: { id: string; played: boolean }) =>
            api.patch<PlaylistSuggestionLeaderboardDto>(endpoints.events.playlistSuggestionPlayed(eventId, id), { played }),
        // The answer comes back with rank 0, so the board is refetched rather than patched.
        onSettled: () => queryClient.invalidateQueries({ queryKey: playlistKeys.leaderboard(eventId) }),
    });

    const togglePlayed = useCallback(
        async (row: PlaylistSuggestionLeaderboardDto) => {
            setError(null);
            try {
                await markPlayed.mutateAsync({ id: row.id, played: !row.playedAt });
            } catch (markError) {
                setError(toErrorMessage(markError));
            }
        },
        [markPlayed, toErrorMessage],
    );

    return {
        rows: leaderboard.data ?? [],
        isLoading: leaderboard.isLoading,
        error,
        // Marking needs a live event; reading the list does not.
        canMark: canMarkSongsPlayed(event),
        pendingId: markPlayed.isPending ? (markPlayed.variables?.id ?? null) : null,
        togglePlayed,
    };
}
