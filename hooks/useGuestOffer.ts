'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

import { useAuth } from '@/hooks/useAuth';
import { useCopyText } from '@/hooks/useCopyText';
import { useIsDemoRoute } from '@/hooks/useIsDemoRoute';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { GuestOfferDto } from '@/lib/api/types';

export const guestOfferKeys = {
    card: (eventId: string) => ['events', eventId, 'guest-offer'] as const,
};

// The guest offer card on the feed. The backend decides who sees it (204 → null); hosts and demo
// feeds are skipped here only to save the request.
export function useGuestOffer(eventId: string, isHost: boolean) {
    const { isAuthenticated } = useAuth();
    const isDemo = useIsDemoRoute();
    const queryClient = useQueryClient();
    const key = guestOfferKeys.card(eventId);

    const query = useQuery({
        queryKey: key,
        queryFn: () => api.get<GuestOfferDto | null>(endpoints.events.guestOffer(eventId)),
        enabled: isAuthenticated && !isHost && !isDemo,
        staleTime: Infinity,
        refetchOnWindowFocus: false,
        retry: false,
    });

    const claim = useMutation({
        retry: false,
        mutationFn: () => api.post<GuestOfferDto | null>(endpoints.events.guestOfferClaim(eventId)),
        onSuccess: (offer) => queryClient.setQueryData(key, offer),
    });

    const dismiss = useMutation({
        retry: false,
        mutationFn: () => api.post<null>(endpoints.events.guestOfferDismiss(eventId)),
        // Hide at once; even a failed dismiss hides the card for this visit.
        onMutate: () => queryClient.setQueryData(key, null),
    });

    const offer = query.data ?? null;
    const copy = useCopyText(offer?.code ?? '');

    const claimCode = useCallback(() => claim.mutate(), [claim]);
    const close = useCallback(() => dismiss.mutate(), [dismiss]);

    return {
        offer,
        claimCode,
        isClaiming: claim.isPending,
        claimFailed: claim.isError,
        close,
        copyCode: copy.copy,
        isCopied: copy.copied,
    };
}
