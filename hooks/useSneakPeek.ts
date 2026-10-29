'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';

import { patchPostInCaches, refreshFeedFirstPage, removePostFromFeed } from '@/hooks/usePosts';
import { vendorKeys } from '@/hooks/useVendors';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { PostResponseDto, SneakPeekPatchDto, SneakPeekRequestDto, SneakPeekSummaryDto, VendorMeDto } from '@/lib/api/types';
import { postKeys } from '@/lib/postQueries';
import { isStaleSneakPeekError } from '@/lib/sneakPeek';

function summaryOf(post: PostResponseDto | null): SneakPeekSummaryDto {
    return post
        ? { postId: post.id, mediaIds: post.media.map((item) => item.id), content: post.content, used: true }
        : { postId: null, mediaIds: [], content: null, used: true };
}

// The vendor page reads `me.sneakPeek` at once; the feed changes only the one post, never every loaded page.
function useSneakPeekCache(eventId: string) {
    const queryClient = useQueryClient();
    return useMemo(() => {
        const meKey = vendorKeys.me(eventId);
        const setSummary = (post: PostResponseDto | null) =>
            queryClient.setQueryData<VendorMeDto | null>(meKey, (me) => (me?.sneakPeek ? { ...me, sneakPeek: summaryOf(post) } : me));

        return {
            // A pinned post lands on the first page.
            created(post: PostResponseDto) {
                setSummary(post);
                return refreshFeedFirstPage(queryClient, eventId);
            },
            updated(post: PostResponseDto) {
                setSummary(post);
                patchPostInCaches(queryClient, eventId, post.id, post);
                return queryClient.invalidateQueries({ queryKey: postKeys.media(post.id) });
            },
            deleted() {
                const postId = queryClient.getQueryData<VendorMeDto | null>(meKey)?.sneakPeek?.postId;
                setSummary(null);
                if (postId) removePostFromFeed(queryClient, eventId, postId);
            },
            failed(error: unknown) {
                if (isStaleSneakPeekError(error)) void queryClient.invalidateQueries({ queryKey: meKey });
            },
        };
    }, [eventId, queryClient]);
}

export function useCreateSneakPeek(eventId: string) {
    const cache = useSneakPeekCache(eventId);
    return useMutation({
        mutationFn: (body: SneakPeekRequestDto) => api.post<PostResponseDto>(endpoints.events.vendorSneakPeek(eventId), body),
        onSuccess: (post) => cache.created(post),
        onError: (error) => cache.failed(error),
    });
}

export function useUpdateSneakPeek(eventId: string) {
    const cache = useSneakPeekCache(eventId);
    return useMutation({
        mutationFn: (patch: SneakPeekPatchDto) => api.patch<PostResponseDto>(endpoints.events.vendorSneakPeek(eventId), patch),
        onSuccess: (post) => cache.updated(post),
        onError: (error) => cache.failed(error),
    });
}

export function useDeleteSneakPeek(eventId: string) {
    const cache = useSneakPeekCache(eventId);
    return useMutation({
        mutationFn: () => api.del<void>(endpoints.events.vendorSneakPeek(eventId)),
        onSuccess: () => cache.deleted(),
        onError: (error) => cache.failed(error),
    });
}
