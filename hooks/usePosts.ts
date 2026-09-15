'use client';

import { type InfiniteData, type QueryClient, useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRef } from 'react';

import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import { normalizeList, type Page } from '@/lib/api/pagination';
import type { MediaResponseDto, PostPatchRequestDto, PostRequestDto, PostResponseDto } from '@/lib/api/types';
import { postKeys, POSTS_PAGE_SIZE } from '@/lib/postQueries';

export { postKeys, POSTS_PAGE_SIZE } from '@/lib/postQueries';

// Applies a partial update to a post wherever it's currently cached — the
// single-post query and, if a page of it is loaded, the event's feed list.
// Used for optimistic updates (likes) where waiting on a refetch would feel
// laggy; other mutations in this file just invalidate instead.
export function patchPostInCaches(queryClient: QueryClient, eventId: string, postId: string, patch: Partial<PostResponseDto>) {
    queryClient.setQueryData<PostResponseDto>(postKeys.detail(postId), (old) => (old ? { ...old, ...patch } : old));

    queryClient.setQueryData<InfiniteData<Page<PostResponseDto>>>(postKeys.list(eventId), (old) => {
        if (!old) return old;
        return {
            ...old,
            pages: old.pages.map((page) => ({
                ...page,
                content: page.content.map((post) => (post.id === postId ? { ...post, ...patch } : post)),
            })),
        };
    });
}

// GET /api/events/{eventId}/posts — any authenticated principal (not
// scoped to event membership, matching EventController's read convention).
// Paginated (pinned first, then newest, soft-deleted excluded server-side);
// author/media/comment+reaction counts are embedded per post, so rendering
// a feed needs no follow-up requests.
export function useEventPosts(eventId: string | null) {
    const { isAuthenticated } = useAuth();
    const queryClient = useQueryClient();
    const etags = useRef(new Map<string, string>());

    return useInfiniteQuery({
        queryKey: postKeys.list(eventId ?? ''),
        queryFn: async ({ pageParam }) => {
            const page = pageParam as number;
            const path = `${endpoints.events.posts(eventId!)}?page=${page}&size=${POSTS_PAGE_SIZE}`;
            const etag = etags.current.get(path);
            const result = await api.conditionalGet<Page<PostResponseDto>>(path, etag ? { headers: { 'If-None-Match': etag } } : undefined);
            if (result.notModified) {
                const cached = queryClient
                    .getQueryData<InfiniteData<Page<PostResponseDto>>>(postKeys.list(eventId!))
                    ?.pages.find((item) => item.page.number === page);
                if (cached) return cached;
            }
            if (result.etag) etags.current.set(path, result.etag);
            return result.data!;
        },
        initialPageParam: 0,
        getNextPageParam: (lastPage) => (lastPage.page.number + 1 < lastPage.page.totalPages ? lastPage.page.number + 1 : undefined),
        enabled: Boolean(eventId) && isAuthenticated,
        refetchInterval: 60_000,
    });
}

export function usePost(id: string | null) {
    const { isAuthenticated } = useAuth();

    return useQuery({
        queryKey: postKeys.detail(id ?? ''),
        queryFn: () => api.get<PostResponseDto>(endpoints.posts.byId(id!)),
        enabled: Boolean(id) && isAuthenticated,
    });
}

// GET /api/posts/{postId}/media — via PostMedia, ordered by displayOrder.
export function usePostMedia(postId: string | null) {
    const { isAuthenticated } = useAuth();

    return useQuery({
        queryKey: postKeys.media(postId ?? ''),
        queryFn: async () => {
            const res = await api.get<MediaResponseDto[]>(endpoints.posts.media(postId!));
            return normalizeList(res).items;
        },
        enabled: Boolean(postId) && isAuthenticated,
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

// PATCH /api/posts/{id} — the post's author, or any host of the event. Only
// content and isPinned are editable; media and type are not touched here.
export function useUpdatePost(eventId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, patch }: { id: string; patch: PostPatchRequestDto }) => api.patch<PostResponseDto>(endpoints.posts.byId(id), patch),
        onSuccess: (post) => {
            patchPostInCaches(queryClient, eventId, post.id, post);
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
