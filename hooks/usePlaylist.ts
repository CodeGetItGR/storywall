import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import { normalizeList } from '@/lib/api/pagination';
import type {
    PlaylistSuggestionLeaderboardDto,
    PlaylistSuggestionRequestDto,
    PlaylistSuggestionResponseDto,
    PlaylistVoteRequestDto,
    PlaylistVoteResponseDto,
} from '@/lib/api/types';

export const playlistKeys = {
    suggestions: (eventId: string) => ['events', eventId, 'playlist-suggestions'] as const,
    leaderboard: (eventId: string) => ['events', eventId, 'playlist-suggestions', 'leaderboard'] as const,
    votes: (suggestionId: string) => ['playlist-suggestions', suggestionId, 'votes'] as const,
};

// GET /api/events/{eventId}/playlist-suggestions — any member of the event.
export function usePlaylistSuggestions(eventId: string | null) {
    const { isAuthenticated } = useAuth();

    return useQuery({
        queryKey: playlistKeys.suggestions(eventId ?? ''),
        queryFn: async () => {
            const res = await api.get<PlaylistSuggestionResponseDto[]>(endpoints.events.playlistSuggestions(eventId!));
            return normalizeList(res).items;
        },
        enabled: Boolean(eventId) && isAuthenticated,
    });
}

export function useCreatePlaylistSuggestion() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (input: PlaylistSuggestionRequestDto) => api.post<PlaylistSuggestionResponseDto>(endpoints.playlistSuggestions.create, input),
        onSuccess: (suggestion) => {
            queryClient.invalidateQueries({
                queryKey: playlistKeys.suggestions(suggestion.eventId),
            });
            queryClient.invalidateQueries({
                queryKey: playlistKeys.leaderboard(suggestion.eventId),
            });
        },
    });
}

// DELETE — author or HOST.
export function useDeletePlaylistSuggestion(eventId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: string) => api.del<void>(endpoints.playlistSuggestions.byId(id)),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: playlistKeys.suggestions(eventId) });
            queryClient.invalidateQueries({ queryKey: playlistKeys.leaderboard(eventId) });
        },
    });
}

// GET /api/playlist-suggestions/{suggestionId}/votes — only needed when the UI
// genuinely needs raw vote rows, not for rendering counts or myVote.
export function usePlaylistVotes(suggestionId: string | null, enabled = true) {
    const { isAuthenticated } = useAuth();

    return useQuery({
        queryKey: playlistKeys.votes(suggestionId ?? ''),
        queryFn: async () => {
            const res = await api.get<PlaylistVoteResponseDto[]>(endpoints.playlistSuggestions.votes(suggestionId!));
            return normalizeList(res).items;
        },
        enabled: Boolean(suggestionId) && enabled && isAuthenticated,
    });
}

export function usePlaylistLeaderboard(eventId: string | null, enabled = true) {
    const { isAuthenticated } = useAuth();

    return useQuery({
        queryKey: playlistKeys.leaderboard(eventId ?? ''),
        queryFn: async () => {
            return api.get<PlaylistSuggestionLeaderboardDto[]>(endpoints.events.playlistSuggestionsLeaderboard(eventId!));
        },
        enabled: Boolean(eventId) && enabled && isAuthenticated,
    });
}

export function useCreatePlaylistVote(eventId: string | null) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (input: PlaylistVoteRequestDto) => api.post<PlaylistVoteResponseDto>(endpoints.playlistVotes.create, input),
        onSuccess: (_vote, input) => {
            if (!eventId) return;

            queryClient.invalidateQueries({
                queryKey: playlistKeys.suggestions(eventId),
            });
            queryClient.invalidateQueries({
                queryKey: playlistKeys.leaderboard(eventId),
            });
            queryClient.invalidateQueries({
                queryKey: playlistKeys.votes(input.playlistSuggestionId),
            });
        },
    });
}

// DELETE — the voter or HOST.
export function useDeletePlaylistVote(eventId: string | null, suggestionId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: string) => api.del<void>(endpoints.playlistVotes.byId(id)),
        onSuccess: () => {
            if (!eventId) return;

            queryClient.invalidateQueries({
                queryKey: playlistKeys.suggestions(eventId),
            });
            queryClient.invalidateQueries({
                queryKey: playlistKeys.leaderboard(eventId),
            });
            queryClient.invalidateQueries({ queryKey: playlistKeys.votes(suggestionId) });
        },
    });
}
