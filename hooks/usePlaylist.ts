import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";
import { normalizeList } from "@/lib/api/pagination";
import type {
  PlaylistSuggestionRequestDto,
  PlaylistSuggestionResponseDto,
  PlaylistVoteRequestDto,
  PlaylistVoteResponseDto,
} from "@/lib/api/types";

export const playlistKeys = {
  suggestions: (eventId: string) => ["events", eventId, "playlist-suggestions"] as const,
  votes: (suggestionId: string) => ["playlist-suggestions", suggestionId, "votes"] as const,
};

// GET /api/events/{eventId}/playlist-suggestions — any member of the event.
export function usePlaylistSuggestions(eventId: string | null) {
  return useQuery({
    queryKey: playlistKeys.suggestions(eventId ?? ""),
    queryFn: async () => {
      const res = await api.get<PlaylistSuggestionResponseDto[]>(endpoints.events.playlistSuggestions(eventId!));
      return normalizeList(res).items;
    },
    enabled: Boolean(eventId),
  });
}

export function useCreatePlaylistSuggestion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: PlaylistSuggestionRequestDto) =>
      api.post<PlaylistSuggestionResponseDto>(endpoints.playlistSuggestions.create, input),
    onSuccess: (suggestion) => {
      queryClient.invalidateQueries({ queryKey: playlistKeys.suggestions(suggestion.eventId) });
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
    },
  });
}

// GET /api/playlist-suggestions/{suggestionId}/votes — member of the suggestion's event.
export function usePlaylistVotes(suggestionId: string | null) {
  return useQuery({
    queryKey: playlistKeys.votes(suggestionId ?? ""),
    queryFn: async () => {
      const res = await api.get<PlaylistVoteResponseDto[]>(endpoints.playlistSuggestions.votes(suggestionId!));
      return normalizeList(res).items;
    },
    enabled: Boolean(suggestionId),
  });
}

export function useCreatePlaylistVote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: PlaylistVoteRequestDto) =>
      api.post<PlaylistVoteResponseDto>(endpoints.playlistVotes.create, input),
    onSuccess: (vote) => {
      queryClient.invalidateQueries({ queryKey: playlistKeys.votes(vote.playlistSuggestionId) });
    },
  });
}

// DELETE — the voter or HOST.
export function useDeletePlaylistVote(suggestionId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.del<void>(endpoints.playlistVotes.byId(id)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: playlistKeys.votes(suggestionId) });
    },
  });
}
