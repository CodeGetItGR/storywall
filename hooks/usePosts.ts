'use client';

import { type InfiniteData, type QueryClient, useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRef } from 'react';

import { useAuth } from '@/hooks/useAuth';
import { useModuleReadable } from '@/hooks/useModuleReadable';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import { normalizeList, type Page } from '@/lib/api/pagination';
import type { MediaResponseDto, PostPatchRequestDto, PostRequestDto, PostResponseDto } from '@/lib/api/types';
import { feedPagePath, postKeys, withFreshFirstPage } from '@/lib/postQueries';
import { LIVE_CONTENT_STALE_TIME } from '@/lib/queryClient';

export { postKeys, POSTS_PAGE_SIZE } from '@/lib/postQueries';

// Applies a partial update to a post wherever it's currently cached — the
// single-post query and, if a page of it is loaded, the event's feed list.
// A function patch is applied to each cached copy. Used for optimistic
// updates (likes, comment counts) where waiting on a refetch would feel
// laggy, and so a change to one post never refetches the whole feed.
export function patchPostInCaches(
    queryClient: QueryClient,
    eventId: string,
    postId: string,
    patch: Partial<PostResponseDto> | ((post: PostResponseDto) => Partial<PostResponseDto>),
) {
    const apply = (post: PostResponseDto): PostResponseDto => ({ ...post, ...(typeof patch === 'function' ? patch(post) : patch) });

    queryClient.setQueryData<PostResponseDto>(postKeys.detail(postId), (old) => (old ? apply(old) : old));

    queryClient.setQueryData<InfiniteData<Page<PostResponseDto>>>(postKeys.list(eventId), (old) => {
        if (!old) return old;
        return {
            ...old,
            pages: old.pages.map((page) => ({
                ...page,
                content: page.content.map((post) => (post.id === postId ? apply(post) : post)),
            })),
        };
    });
}

// Refetches one post into every cached copy, for a change the cache can't
// work out by itself. Best-effort, like refreshFeedFirstPage: on a failure
// the feed's refetchInterval catches up.
export async function refreshPostInCaches(queryClient: QueryClient, eventId: string, postId: string) {
    try {
        const post = await api.get<PostResponseDto>(endpoints.posts.byId(postId));
        patchPostInCaches(queryClient, eventId, postId, post);
    } catch {
        // See above.
    }
}

// GET /api/events/{eventId}/posts — any authenticated principal (not
// scoped to event membership, matching EventController's read convention).
// Paginated (pinned first, then newest, soft-deleted excluded server-side);
// author/media/comment+reaction counts are embedded per post, so rendering
// a feed needs no follow-up requests.
export function useEventPosts(eventId: string | null) {
    const { isAuthenticated } = useAuth();
    const postsReadable = useModuleReadable(eventId, 'posts');
    const queryClient = useQueryClient();
    const etags = useRef(new Map<string, string>());

    return useInfiniteQuery({
        queryKey: postKeys.list(eventId ?? ''),
        queryFn: async ({ pageParam }) => {
            const page = pageParam as number;
            const path = feedPagePath(eventId!, page);
            const etag = etags.current.get(path);
            let result = await api.conditionalGet<Page<PostResponseDto>>(path, etag ? { headers: { 'If-None-Match': etag } } : undefined);
            if (result.notModified) {
                const cached = queryClient
                    .getQueryData<InfiniteData<Page<PostResponseDto>>>(postKeys.list(eventId!))
                    ?.pages.find((item) => item.page.number === page);
                if (cached) return cached;
                // The ETag outlived the page it described (the cache was reset or
                // collected), so a 304 leaves nothing to return. Ask again without it.
                etags.current.delete(path);
                result = await api.conditionalGet<Page<PostResponseDto>>(path);
            }
            if (result.etag) etags.current.set(path, result.etag);
            return result.data!;
        },
        initialPageParam: 0,
        getNextPageParam: (lastPage) => (lastPage.page.number + 1 < lastPage.page.totalPages ? lastPage.page.number + 1 : undefined),
        enabled: Boolean(eventId) && isAuthenticated && postsReadable,
        staleTime: LIVE_CONTENT_STALE_TIME,
        refetchInterval: 60_000,
    });
}

// Brings the feed's first page up to date without refetching the pages after
// it. The live stream only says that something changed, and every change moves
// every page's ETag, so invalidating the list re-downloads every page a guest
// has scrolled through, for every guest, on every change. New posts land on
// the first page; the later pages catch up on the feed's refetchInterval.
//
// A failure is left alone rather than retried by invalidating the whole list:
// under load that would multiply the requests this exists to save. The next
// change, or the interval, tries again.
export async function refreshFeedFirstPage(queryClient: QueryClient, eventId: string) {
    const key = postKeys.list(eventId);
    const cached = queryClient.getQueryData<InfiniteData<Page<PostResponseDto>>>(key);
    if (!cached || cached.pages.length <= 1) {
        await queryClient.invalidateQueries({ queryKey: key });
        return;
    }
    try {
        const first = await api.get<Page<PostResponseDto>>(feedPagePath(eventId, 0));
        queryClient.setQueryData<InfiniteData<Page<PostResponseDto>>>(key, (old) => (old ? withFreshFirstPage(old, first) : old));
    } catch {
        // See above.
    }
}

export function usePost(id: string | null) {
    const { isAuthenticated } = useAuth();

    return useQuery({
        queryKey: postKeys.detail(id ?? ''),
        queryFn: () => api.get<PostResponseDto>(endpoints.posts.byId(id!)),
        enabled: Boolean(id) && isAuthenticated,
        staleTime: LIVE_CONTENT_STALE_TIME,
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
        staleTime: LIVE_CONTENT_STALE_TIME,
    });
}

// POST /api/posts — USER or GUEST. A guest needs SCOPE_event:{eventId}:post
// on their JWT; the server rejects an eventId outside that scope.
export function useCreatePost() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ signal, ...input }: PostRequestDto & { signal?: AbortSignal }) =>
            api.post<PostResponseDto>(endpoints.posts.create, input, { signal }),
        // A new post lands on the first page, so only that page is refetched.
        onSuccess: (post) => {
            void refreshFeedFirstPage(queryClient, post.eventId);
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
        // Dropped from the cached feed at once instead of refetching every page.
        // The pages after it are offsets that moved by one; like a post someone
        // else deletes, they catch up on the feed's refetchInterval.
        onSuccess: (_data, id) => {
            queryClient.setQueryData<InfiniteData<Page<PostResponseDto>>>(postKeys.list(eventId), (old) =>
                old ? { ...old, pages: old.pages.map((page) => ({ ...page, content: page.content.filter((post) => post.id !== id) })) } : old,
            );
        },
    });
}
