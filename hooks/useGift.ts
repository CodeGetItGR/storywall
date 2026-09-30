'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/hooks/useAuth';
import { myEventsKeys } from '@/hooks/useMyEvents';
import { api, ApiError } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type {
    GiftCardResponseDto,
    GiftClaimPreviewDto,
    GiftClaimRequestDto,
    GiftClaimResponseDto,
    GiftHandoverRequestDto,
    GiftHandoverResponseDto,
} from '@/lib/api/types';

export const giftKeys = {
    event: (eventId: string) => ['events', eventId, 'gift'] as const,
    // The card just issued, PIN included. Kept only in memory: no endpoint returns
    // the PIN again. Outside ['events', id] so an event refetch never touches it.
    issuedCard: (eventId: string) => ['gift-cards', eventId] as const,
    claimPreview: (token: string) => ['gift-claims', token] as const,
};

// GET /api/events/{eventId}/gift — any host. Null when the event isn't a gift (404).
export function useEventGift(eventId: string | null) {
    const { isAuthenticated } = useAuth();

    return useQuery({
        queryKey: giftKeys.event(eventId ?? ''),
        queryFn: async () => {
            try {
                return await api.get<GiftHandoverResponseDto>(endpoints.events.gift(eventId!));
            } catch (error) {
                if (error instanceof ApiError && error.status === 404) return null;
                throw error;
            }
        },
        enabled: Boolean(eventId) && isAuthenticated,
    });
}

// PUT /api/events/{eventId}/gift — primary host. Declares the gift, or edits it.
export function useSaveGift(eventId: string | null) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ eventId: targetId, input }: { eventId?: string; input: GiftHandoverRequestDto }) =>
            api.put<GiftHandoverResponseDto>(endpoints.events.gift(targetId ?? eventId!), input),
        onSuccess: (gift, { eventId: targetId }) => queryClient.setQueryData(giftKeys.event(targetId ?? eventId!), gift),
    });
}

// POST /api/events/{eventId}/gift/card — primary host. The only response with the PIN.
export function useIssueGiftCard(eventId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: () => api.post<GiftCardResponseDto>(endpoints.events.giftCard(eventId)),
        onSuccess: (card) => {
            queryClient.setQueryData(giftKeys.issuedCard(eventId), card);
            void queryClient.invalidateQueries({ queryKey: giftKeys.event(eventId) });
        },
    });
}

// The card issued in this visit, if any. Never fetched.
export function useIssuedGiftCard(eventId: string) {
    return useQuery<GiftCardResponseDto | null>({
        queryKey: giftKeys.issuedCard(eventId),
        queryFn: () => null,
        enabled: false,
        staleTime: Infinity,
        gcTime: Infinity,
    });
}

// GET /api/gift-claims/{token} — public.
export function useGiftClaimPreview(token: string) {
    return useQuery({
        queryKey: giftKeys.claimPreview(token),
        queryFn: () => api.get<GiftClaimPreviewDto>(endpoints.giftClaims.preview(token)),
    });
}

// POST /api/gift-claims/{token}/claim. The response names no event, so the
// caller's event lists are refreshed rather than one event.
export function useClaimGift(token: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (input: GiftClaimRequestDto) => api.post<GiftClaimResponseDto>(endpoints.giftClaims.claim(token), input),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: myEventsKeys.all });
            void queryClient.invalidateQueries({ queryKey: giftKeys.claimPreview(token) });
        },
    });
}
