import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { Page } from '@/lib/api/pagination';
import type { WishbookEntryRequestDto, WishbookEntryResponseDto } from '@/lib/api/types';

export const WISHBOOK_PAGE_SIZE = 20;
export const wishbookKeys = {
    list: (eventId: string) => ['events', eventId, 'wishbook'] as const,
    count: (eventId: string) => ['events', eventId, 'wishbook', 'count'] as const,
};

export function useWishbook(eventId: string | null) {
    const { isAuthenticated } = useAuth();

    return useInfiniteQuery({
        queryKey: wishbookKeys.list(eventId ?? ''),
        queryFn: ({ pageParam }) =>
            api.get<Page<WishbookEntryResponseDto>>(`${endpoints.events.wishbook(eventId!)}?page=${pageParam}&size=${WISHBOOK_PAGE_SIZE}`),
        initialPageParam: 0,
        getNextPageParam: (page) => (page.number + 1 < page.totalPages ? page.number + 1 : undefined),
        enabled: Boolean(eventId) && isAuthenticated,
    });
}

export function useWishbookCount(eventId: string | null) {
    const { isAuthenticated } = useAuth();

    return useQuery({
        queryKey: wishbookKeys.count(eventId ?? ''),
        queryFn: () => api.get<number>(endpoints.events.wishbookCount(eventId!)),
        enabled: Boolean(eventId) && isAuthenticated,
    });
}

export function useCreateWishbookEntry(eventId: string) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (input: WishbookEntryRequestDto) => api.post<WishbookEntryResponseDto>(endpoints.events.wishbook(eventId), input),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: wishbookKeys.list(eventId) });
            queryClient.invalidateQueries({ queryKey: wishbookKeys.count(eventId) });
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
