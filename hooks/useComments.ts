'use client';

import { type InfiniteData, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRef } from 'react';

import { useAuth } from '@/hooks/useAuth';
import { patchPostInCaches, refreshPostInCaches } from '@/hooks/usePosts';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { Page } from '@/lib/api/pagination';
import type { CommentRequestDto, CommentResponseDto, PostResponseDto } from '@/lib/api/types';
import { withRecentComment } from '@/lib/comments';
import { postKeys } from '@/lib/postQueries';
import { LIVE_CONTENT_STALE_TIME } from '@/lib/queryClient';

// NOTE: this key is nested under postKeys.detail's ['posts', id] — React
// Query's invalidateQueries matches by prefix, so invalidating
// postKeys.detail(id) also matches this query unless called with
// { exact: true }. See useCreateComment.onSuccess below; this bit us once
// already (a post-detail invalidation was silently wiping the comment list
// it had just been appended to).
export const commentKeys = {
    list: (postId: string) => ['posts', postId, 'comments'] as const,
};

const COMMENTS_PAGE_SIZE = 30;

// GET /api/posts/{postId}/comments — event member (checked in the service).
// Paginated oldest-first (unlike every other list endpoint), so that a
// reply's parent is always on the same page or an earlier one.
export function usePostComments(postId: string | null) {
    const { isAuthenticated } = useAuth();
    const queryClient = useQueryClient();
    const etags = useRef(new Map<string, string>());

    return useInfiniteQuery({
        queryKey: commentKeys.list(postId ?? ''),
        queryFn: async ({ pageParam }) => {
            const page = pageParam as number;
            const path = `${endpoints.posts.comments(postId!)}?page=${page}&size=${COMMENTS_PAGE_SIZE}`;
            const etag = etags.current.get(path);
            let result = await api.conditionalGet<Page<CommentResponseDto>>(path, etag ? { headers: { 'If-None-Match': etag } } : undefined);
            if (result.notModified) {
                const cached = queryClient
                    .getQueryData<InfiniteData<Page<CommentResponseDto>>>(commentKeys.list(postId!))
                    ?.pages.find((item) => item.page.number === page);
                if (cached) return cached;
                // The ETag outlived the page it described (the cache was reset or
                // collected), so a 304 leaves nothing to return. Ask again without it.
                etags.current.delete(path);
                result = await api.conditionalGet<Page<CommentResponseDto>>(path);
            }
            if (result.etag) etags.current.set(path, result.etag);
            return result.data!;
        },
        initialPageParam: 0,
        getNextPageParam: (lastPage) => (lastPage.page.number + 1 < lastPage.page.totalPages ? lastPage.page.number + 1 : undefined),
        enabled: Boolean(postId) && isAuthenticated,
        refetchInterval: 60_000,
        staleTime: LIVE_CONTENT_STALE_TIME,
    });
}

// POST /api/comments — event member. `parentCommentId` supports threaded replies.
// Takes eventId (not carried on CommentRequestDto/CommentResponseDto) so the
// post's cached commentCount can be refreshed precisely — same pattern as
// useDeletePost(eventId).
//
// This deliberately does NOT write the new comment into the paginated
// comments cache. Comments sort oldest-first, so a brand-new comment belongs
// on whatever the LAST page turns out to be, which is almost never the page(s)
// currently loaded — there's no correct page to append it to client-side, and
// any later refetch of the loaded range would just erase it again. Instead,
// the caller (usePostCommentThread) holds newly-created comments as
// session-local "pending" state and merges them into the rendered list; see
// that hook for the merge/dedupe logic that replaces this.
export function useCreateComment(eventId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (input: CommentRequestDto) => api.post<CommentResponseDto>(endpoints.comments.create, input),
        onSuccess: (comment) => {
            // Patch the post's commentCount and preview in place instead of
            // refetching. Invalidating postKeys.detail would prefix-match
            // commentKeys.list (see the comment on that key above) and refetch
            // the comment list right out from under the pending-comment merge;
            // invalidating the feed would refetch every page loaded. The open
            // post's copy is the base for both, so the two always agree.
            const openPost = queryClient.getQueryData<PostResponseDto>(postKeys.detail(comment.postId));
            patchPostInCaches(queryClient, eventId, comment.postId, (post) => {
                const base = openPost ?? post;
                return { commentCount: base.commentCount + 1, recentComments: withRecentComment(base.recentComments, comment) };
            });
        },
    });
}

// DELETE /api/comments/{id} — author or HOST.
export function useDeleteComment(eventId: string, postId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: string) => api.del<void>(endpoints.comments.byId(id)),
        onSuccess: (_data, id) => {
            const openPost = queryClient.getQueryData<PostResponseDto>(postKeys.detail(postId));
            patchPostInCaches(queryClient, eventId, postId, (post) => {
                const base = openPost ?? post;
                return {
                    commentCount: Math.max(0, base.commentCount - 1),
                    recentComments: base.recentComments.filter((recent) => recent.id !== id),
                };
            });
            queryClient.invalidateQueries({ queryKey: commentKeys.list(postId) });
            // The comment that now moves into the preview is only on the
            // server, so this one post is refetched, not the whole feed.
            void refreshPostInCaches(queryClient, eventId, postId);
        },
    });
}
