'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { CheckoutResponseDto, EventBillingResponseDto, RefundEligibilityResponseDto, RefundRequestResponseDto } from '@/lib/api/types';

export const billingKeys = { all: ['billing'] as const, event: (id: string) => ['events', id, 'billing'] as const };

export function useEventBilling(eventId: string | null, enabled = true) {
    return useQuery({
        queryKey: billingKeys.event(eventId ?? ''),
        queryFn: () => api.get<EventBillingResponseDto>(endpoints.events.billing(eventId!)),
        enabled: Boolean(eventId) && enabled,
        refetchInterval: (query) => {
            const data = query.state.data;
            const hasPendingOrder = data?.orders.some((order) => order.status === 'PENDING') ?? true;
            return enabled && hasPendingOrder ? 5000 : false;
        },
    });
}

export function useCheckout(eventId: string, subscription = false) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: () => api.post<CheckoutResponseDto>(subscription ? endpoints.events.subscriptionCheckout(eventId) : endpoints.events.checkout(eventId)),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: billingKeys.event(eventId) }),
    });
}

export function useRefundEligibility(eventId: string | null) {
    return useQuery({
        queryKey: ['events', eventId, 'refund-eligibility'],
        queryFn: () => api.get<RefundEligibilityResponseDto>(endpoints.events.refundEligibility(eventId!)),
        enabled: Boolean(eventId),
    });
}

export function useRequestRefund(eventId: string) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (reason: string) => api.post<RefundRequestResponseDto>(endpoints.events.refundRequests(eventId), { reason }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['events', eventId] });
            queryClient.invalidateQueries({ queryKey: ['events', eventId, 'refund-eligibility'] });
            queryClient.invalidateQueries({ queryKey: billingKeys.event(eventId) });
        },
    });
}
