import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";
import { normalizeList } from "@/lib/api/pagination";
import type { StoryRequestDto, StoryResponseDto } from "@/lib/api/types";

export const storyKeys = {
  list: (eventId: string) => ["events", eventId, "stories"] as const,
  detail: (id: string) => ["stories", id] as const,
};

// GET /api/events/{eventId}/stories — event member. `expiresAt` is stored
// but there's no confirmed server-side auto-purge — filter `expiresAt < now`
// client-side until confirmed otherwise.
export function useEventStories(eventId: string | null) {
  return useQuery({
    queryKey: storyKeys.list(eventId ?? ""),
    queryFn: async () => {
      const res = await api.get<StoryResponseDto[]>(endpoints.events.stories(eventId!));
      return normalizeList(res).items;
    },
    enabled: Boolean(eventId),
  });
}

// GET /api/stories/{id} — event member.
export function useStory(id: string | null) {
  return useQuery({
    queryKey: storyKeys.detail(id ?? ""),
    queryFn: () => api.get<StoryResponseDto>(endpoints.stories.byId(id!)),
    enabled: Boolean(id),
  });
}

// POST /api/stories — event member. `mediaId` must reference an
// already-uploaded Media (upload via useUploadMedia first).
export function useCreateStory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: StoryRequestDto) => api.post<StoryResponseDto>(endpoints.stories.create, input),
    onSuccess: (story) => {
      queryClient.invalidateQueries({ queryKey: storyKeys.list(story.eventId) });
    },
  });
}

// DELETE /api/stories/{id} — author or HOST.
export function useDeleteStory(eventId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.del<void>(endpoints.stories.byId(id)),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: storyKeys.list(eventId) });
      queryClient.removeQueries({ queryKey: storyKeys.detail(id) });
    },
  });
}
