'use client';

import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/hooks/useAuth';
import { useModuleReadable } from '@/hooks/useModuleReadable';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { Page } from '@/lib/api/pagination';
import type { WishbookEntryEditDto, WishbookEntryRequestDto, WishbookEntryResponseDto } from '@/lib/api/types';
import { LIVE_CONTENT_STALE_TIME } from '@/lib/queryClient';
import { buildWishFormData } from '@/lib/wishbook/voice';

export const WISHBOOK_PAGE_SIZE = 20;
export const wishbookKeys = {
    list: (eventId: string) => ['events', eventId, 'wishbook'] as const,
    count: (eventId: string) => ['events', eventId, 'wishbook', 'count'] as const,
    // Under the list key on purpose: invalidating the list (a write, a delete) refreshes this too.
    mine: (eventId: string) => ['events', eventId, 'wishbook', 'mine'] as const,
};

// Hosts and co-hosts only: the API answers 403 to anyone else. Pass null for a guest.
export function useWishbook(eventId: string | null) {
    const { isAuthenticated } = useAuth();
    const wishbookReadable = useModuleReadable(eventId, 'wishbook');

    return useInfiniteQuery({
        queryKey: wishbookKeys.list(eventId ?? ''),
        queryFn: ({ pageParam }) =>
            api.get<Page<WishbookEntryResponseDto>>(`${endpoints.events.wishbook(eventId!)}?page=${pageParam}&size=${WISHBOOK_PAGE_SIZE}`),
        initialPageParam: 0,
        getNextPageParam: (page) => (page.page.number + 1 < page.page.totalPages ? page.page.number + 1 : undefined),
        enabled: Boolean(eventId) && isAuthenticated && wishbookReadable,
        staleTime: LIVE_CONTENT_STALE_TIME,
    });
}

export function useWishbookCount(eventId: string | null) {
    const { isAuthenticated } = useAuth();
    const wishbookReadable = useModuleReadable(eventId, 'wishbook');

    return useQuery({
        queryKey: wishbookKeys.count(eventId ?? ''),
        queryFn: () => api.get<number>(endpoints.events.wishbookCount(eventId!)),
        enabled: Boolean(eventId) && isAuthenticated && wishbookReadable,
        staleTime: LIVE_CONTENT_STALE_TIME,
    });
}

// The caller's own wishes (GET /wishbook/mine), for the "Your messages" list guests see.
export function useMyWishes(eventId: string | null) {
    const { isAuthenticated } = useAuth();
    const wishbookReadable = useModuleReadable(eventId, 'wishbook');

    return useInfiniteQuery({
        queryKey: wishbookKeys.mine(eventId ?? ''),
        queryFn: ({ pageParam }) =>
            api.get<Page<WishbookEntryResponseDto>>(`${endpoints.events.wishbookMine(eventId!)}?page=${pageParam}&size=${WISHBOOK_PAGE_SIZE}`),
        initialPageParam: 0,
        getNextPageParam: (page) => (page.page.number + 1 < page.page.totalPages ? page.page.number + 1 : undefined),
        enabled: Boolean(eventId) && isAuthenticated && wishbookReadable,
        staleTime: LIVE_CONTENT_STALE_TIME,
    });
}

// A wish with a recording goes as multipart (KAN-219); a written-only one stays JSON.
type CreateWishInput = WishbookEntryRequestDto & { audio?: Blob | null };

export function useCreateWishbookEntry(eventId: string) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ audio, ...wish }: CreateWishInput) =>
            audio
                ? api.postForm<WishbookEntryResponseDto>(endpoints.events.wishbook(eventId), buildWishFormData(wish, audio))
                : api.post<WishbookEntryResponseDto>(endpoints.events.wishbook(eventId), wish),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: wishbookKeys.list(eventId) });
            queryClient.invalidateQueries({ queryKey: wishbookKeys.count(eventId) });
        },
    });
}

// audio replaces the recording; removeAudio drops it; neither keeps it. Always send the current text:
// a missing message drops it.
type EditWishInput = { entryId: string; audio?: Blob | null } & WishbookEntryEditDto;

export function useEditWishbookEntry(eventId: string) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ entryId, audio, ...wish }: EditWishInput) =>
            audio
                ? api.putForm<WishbookEntryResponseDto>(endpoints.wishbook.byId(entryId), buildWishFormData(wish, audio))
                : api.put<WishbookEntryResponseDto>(endpoints.wishbook.byId(entryId), wish),
        onSuccess: () => {
            // A host-visible wish changed. The list key is a prefix of "mine": one invalidation refreshes both.
            queryClient.invalidateQueries({ queryKey: wishbookKeys.list(eventId) });
        },
    });
}

export function useDeleteWishbookEntry(eventId: string) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (entryId: string) => api.del<void>(endpoints.wishbook.byId(entryId)),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: wishbookKeys.list(eventId) });
            queryClient.invalidateQueries({ queryKey: wishbookKeys.count(eventId) });
        },
    });
}
