'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api, ApiError } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { EventGiftAccountRequestDto, EventGiftAccountResponseDto } from '@/lib/api/types';

export const giftAccountKeys = { event: (eventId: string) => ['events', eventId, 'gift-account'] as const };

export function useGiftAccount(eventId: string | null) {
    return useQuery({
        queryKey: giftAccountKeys.event(eventId ?? ''),
        queryFn: async () => {
            try {
                return await api.get<EventGiftAccountResponseDto>(endpoints.events.giftAccount(eventId!));
            } catch (error) {
                if (error instanceof ApiError && error.status === 404) return null;
                throw error;
            }
        },
        enabled: Boolean(eventId),
        staleTime: 0,
        gcTime: 0,
    });
}

export function useSaveGiftAccount(eventId: string) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (input: EventGiftAccountRequestDto) => api.put<EventGiftAccountResponseDto>(endpoints.events.giftAccount(eventId), input),
        onSuccess: (account) => queryClient.setQueryData(giftAccountKeys.event(eventId), account),
    });
}

export function useDeleteGiftAccount(eventId: string) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: () => api.del<void>(endpoints.events.giftAccount(eventId)),
        onSuccess: () => queryClient.setQueryData(giftAccountKeys.event(eventId), null),
    });
}
