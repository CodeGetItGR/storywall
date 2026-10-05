import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import { ignoreConcurrentModification } from '@/lib/api/errors';
import type { PostReactionsResponseDto, ReactionRequestDto, ReactionResponseDto } from '@/lib/api/types';
import { LIVE_CONTENT_STALE_TIME } from '@/lib/queryClient';

export const reactionKeys = {
    list: (postId: string) => ['posts', postId, 'reactions'] as const,
};

export function fetchPostReactions(postId: string): Promise<PostReactionsResponseDto> {
    return api.get<PostReactionsResponseDto>(endpoints.posts.reactions(postId));
}

// GET /api/posts/{postId}/reactions — event member (checked in the service). Counts plus the
// caller's own reaction; other members' reactions are never listed.
export function usePostReactions(postId: string | null) {
    const { isAuthenticated } = useAuth();

    return useQuery({
        queryKey: reactionKeys.list(postId ?? ''),
        queryFn: () => fetchPostReactions(postId!),
        enabled: Boolean(postId) && isAuthenticated,
        staleTime: LIVE_CONTENT_STALE_TIME,
    });
}

// POST /api/reactions — event member. Upserts the caller's one reaction on
// the post: create if missing, no-op for the same type, switch for a new type.
export function useCreateReaction() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (input: ReactionRequestDto) => api.post<ReactionResponseDto>(endpoints.reactions.create, input),
        onSuccess: (reaction) => {
            queryClient.invalidateQueries({ queryKey: reactionKeys.list(reaction.postId) });
        },
    });
}

// DELETE /api/reactions/{id} — reactor or HOST. A 5128 (the same reaction
// removed or changed by another request at that moment) counts as done; the
// counts are refetched either way.
export function useDeleteReaction(postId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: string) => ignoreConcurrentModification(api.del<void>(endpoints.reactions.byId(id))),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: reactionKeys.list(postId) });
        },
    });
}
