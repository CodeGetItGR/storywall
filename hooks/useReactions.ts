import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";
import { normalizeList } from "@/lib/api/pagination";
import type { ReactionRequestDto, ReactionResponseDto } from "@/lib/api/types";

export const reactionKeys = {
  list: (postId: string) => ["posts", postId, "reactions"] as const,
};

export async function fetchPostReactions(postId: string): Promise<ReactionResponseDto[]> {
  const res = await api.get<ReactionResponseDto[]>(endpoints.posts.reactions(postId));
  return normalizeList(res).items;
}

// GET /api/posts/{postId}/reactions — event member (checked in the service).
export function usePostReactions(postId: string | null) {
  return useQuery({
    queryKey: reactionKeys.list(postId ?? ""),
    queryFn: () => fetchPostReactions(postId!),
    enabled: Boolean(postId),
  });
}

// POST /api/reactions — event member. Repeating the same (postId, memberId,
// reactionType) triple now 409s cleanly (errorCode 5005 DUPLICATE_REACTION)
// instead of a raw constraint-violation 500 — surface that as "already reacted".
export function useCreateReaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: ReactionRequestDto) => api.post<ReactionResponseDto>(endpoints.reactions.create, input),
    onSuccess: (reaction) => {
      queryClient.invalidateQueries({ queryKey: reactionKeys.list(reaction.postId) });
    },
  });
}

// DELETE /api/reactions/{id} — reactor or HOST.
export function useDeleteReaction(postId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.del<void>(endpoints.reactions.byId(id)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: reactionKeys.list(postId) });
    },
  });
}
