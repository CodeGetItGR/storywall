import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";
import { normalizeList } from "@/lib/api/pagination";
import type { CommentRequestDto, CommentResponseDto } from "@/lib/api/types";

export const commentKeys = {
  list: (postId: string) => ["posts", postId, "comments"] as const,
};

// GET /api/posts/{postId}/comments — event member (checked in the service).
export function usePostComments(postId: string | null) {
  return useQuery({
    queryKey: commentKeys.list(postId ?? ""),
    queryFn: async () => {
      const res = await api.get<CommentResponseDto[]>(endpoints.posts.comments(postId!));
      return normalizeList(res).items;
    },
    enabled: Boolean(postId),
  });
}

// POST /api/comments — event member. `parentCommentId` supports threaded replies.
export function useCreateComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CommentRequestDto) => api.post<CommentResponseDto>(endpoints.comments.create, input),
    onSuccess: (comment) => {
      queryClient.invalidateQueries({ queryKey: commentKeys.list(comment.postId) });
    },
  });
}

// DELETE /api/comments/{id} — author or HOST.
export function useDeleteComment(postId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.del<void>(endpoints.comments.byId(id)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: commentKeys.list(postId) });
    },
  });
}
