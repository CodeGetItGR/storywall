'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

import { vendorKeys } from '@/hooks/useVendors';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { PostResponseDto, SneakPeekPatchDto, SneakPeekRequestDto, SneakPeekSummaryDto, VendorMeDto } from '@/lib/api/types';
import { postKeys } from '@/lib/postQueries';

// After any change: the vendor page reads `me.sneakPeek` at once, the feed refetches for the pinned post.
function useSneakPeekRefresh(eventId: string) {
    const queryClient = useQueryClient();
    return useCallback(
        (post: PostResponseDto | null) => {
            const summary: SneakPeekSummaryDto = post
                ? { postId: post.id, mediaIds: post.media.map((item) => item.id), content: post.content, used: true }
                : { postId: null, mediaIds: [], content: null, used: true };
            queryClient.setQueryData<VendorMeDto | null>(vendorKeys.me(eventId), (me) => (me?.sneakPeek ? { ...me, sneakPeek: summary } : me));
            return queryClient.invalidateQueries({ queryKey: postKeys.list(eventId) });
        },
        [eventId, queryClient],
    );
}

export function useCreateSneakPeek(eventId: string) {
    const refresh = useSneakPeekRefresh(eventId);
    return useMutation({
        mutationFn: (body: SneakPeekRequestDto) => api.post<PostResponseDto>(endpoints.events.vendorSneakPeek(eventId), body),
        onSuccess: (post) => refresh(post),
    });
}

export function useUpdateSneakPeek(eventId: string) {
    const refresh = useSneakPeekRefresh(eventId);
    return useMutation({
        mutationFn: (patch: SneakPeekPatchDto) => api.patch<PostResponseDto>(endpoints.events.vendorSneakPeek(eventId), patch),
        onSuccess: (post) => refresh(post),
    });
}

export function useDeleteSneakPeek(eventId: string) {
    const refresh = useSneakPeekRefresh(eventId);
    return useMutation({
        mutationFn: () => api.del<void>(endpoints.events.vendorSneakPeek(eventId)),
        onSuccess: () => refresh(null),
    });
}
