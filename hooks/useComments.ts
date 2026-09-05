import { type InfiniteData, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/hooks/useAuth';
import { postKeys } from '@/hooks/usePosts';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { Page } from '@/lib/api/pagination';
import type { CommentRequestDto, CommentResponseDto } from '@/lib/api/types';

export const commentKeys = {
    list: (postId: string) => ['posts', postId, 'comments'] as const,
};

const COMMENTS_PAGE_SIZE = 30;

// GET /api/posts/{postId}/comments — event member (checked in the service).
// Paginated oldest-first (unlike every other list endpoint), so that a
// reply's parent is always on the same page or an earlier one.
export function usePostComments(postId: string | null) {
    const { isAuthenticated } = useAuth();

    return useInfiniteQuery({
        queryKey: commentKeys.list(postId ?? ''),
        queryFn: ({ pageParam }) =>
            api.get<Page<CommentResponseDto>>(`${endpoints.posts.comments(postId!)}?page=${pageParam}&size=${COMMENTS_PAGE_SIZE}`),
        initialPageParam: 0,
        getNextPageParam: (lastPage) => (lastPage.number + 1 < lastPage.totalPages ? lastPage.number + 1 : undefined),
        enabled: Boolean(postId) && isAuthenticated,
    });
}

// POST /api/comments — event member. `parentCommentId` supports threaded replies.
// Takes eventId (not carried on CommentRequestDto/CommentResponseDto) so the
// post's cached commentCount can be refreshed precisely — same pattern as
// useDeletePost(eventId).
export function useCreateComment(eventId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (input: CommentRequestDto) => api.post<CommentResponseDto>(endpoints.comments.create, input),
        // Comments sort oldest-first, so a new comment belongs on the last
        // page, not the first — invalidating whatever pages are already
        // loaded would refetch those unchanged ranges and never surface it.
        // Append it to the cache directly instead.
        onSuccess: async (comment) => {
            // A new comment changes the list length, which can retrigger the
            // infinite-scroll sentinel (it re-observes whenever item count
            // changes, and IntersectionObserver fires immediately if already
            // in view) and start a concurrent fetchNextPage. If that fetch
            // resolves after the append below, it overwrites the cache with
            // pre-append data and the new comment disappears. Cancel it first
            // so it can't race the manual append.
            await queryClient.cancelQueries({ queryKey: commentKeys.list(comment.postId) });
            queryClient.setQueryData<InfiniteData<Page<CommentResponseDto>>>(commentKeys.list(comment.postId), (data) => {
                if (!data || data.pages.length === 0) return data;
                const lastPageIndex = data.pages.length - 1;
                return {
                    ...data,
                    pages: data.pages.map((page, index) =>
                        index === lastPageIndex ? { ...page, content: [...page.content, comment], totalElements: page.totalElements + 1 } : page
                    ),
                };
            });
            queryClient.invalidateQueries({ queryKey: postKeys.detail(comment.postId) });
            queryClient.invalidateQueries({ queryKey: postKeys.list(eventId) });
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
