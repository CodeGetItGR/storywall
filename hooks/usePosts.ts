import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";
import { normalizeList } from "@/lib/api/pagination";
import type { MediaResponseDto, PostRequestDto, PostResponseDto } from "@/lib/api/types";

export const postKeys = {
  list: (eventId: string) => ["events", eventId, "posts"] as const,
  detail: (id: string) => ["posts", id] as const,
  media: (postId: string) => ["posts", postId, "media"] as const,
};

// GET /api/events/{eventId}/posts — any authenticated principal (not
// scoped to event membership, matching EventController's read convention).
export function useEventPosts(eventId: string | null) {
  return useQuery({
    queryKey: postKeys.list(eventId ?? ""),
    queryFn: async () => {
      const res = await api.get<PostResponseDto[]>(endpoints.events.posts(eventId!));
      return normalizeList(res).items;
    },
    enabled: Boolean(eventId),
  });
}

export function usePost(id: string | null) {
  return useQuery({
    queryKey: postKeys.detail(id ?? ""),
    queryFn: () => api.get<PostResponseDto>(endpoints.posts.byId(id!)),
    enabled: Boolean(id),
  });
}

// GET /api/posts/{postId}/media — via PostMedia, ordered by displayOrder.
export function usePostMedia(postId: string | null) {
  return useQuery({
    queryKey: postKeys.media(postId ?? ""),
    queryFn: async () => {
      const res = await api.get<MediaResponseDto[]>(endpoints.posts.media(postId!));
      return normalizeList(res).items;
    },
    enabled: Boolean(postId),
  });
}

// POST /api/posts — USER or GUEST. A guest needs SCOPE_event:{eventId}:post
// on their JWT; the server rejects an eventId outside that scope.
export function useCreatePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: PostRequestDto) => api.post<PostResponseDto>(endpoints.posts.create, input),
    onSuccess: (post) => {
      queryClient.invalidateQueries({ queryKey: postKeys.list(post.eventId) });
    },
  });
}

// DELETE /api/posts/{id} — USER only.
export function useDeletePost(eventId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.del<void>(endpoints.posts.byId(id)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: postKeys.list(eventId) });
    },
  });
}
