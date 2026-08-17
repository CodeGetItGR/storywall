'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { appConfigKeys } from '@/hooks/useAppConfig';
import { usageKeys } from '@/hooks/useUsage';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type {
    CheckoutResponseDto,
    EventAddonDto,
    EventAddonRequestDto,
    EventBillingResponseDto,
    RefundEligibilityResponseDto,
    RefundRequestResponseDto,
    StorageCheckoutRequestDto,
    SubscriptionSummaryDto,
    UpgradeCheckoutRequestDto,
} from '@/lib/api/types';

// The server can now legitimately refuse to settle an order (amount collected
// disagrees with the price), so a PENDING order is no longer guaranteed to
// resolve. Stop polling after this long and let the UI offer a support route
// rather than spinning forever.
const PENDING_ORDER_POLL_TIMEOUT_MS = 3 * 60 * 1000;

export const billingKeys = { all: ['billing'] as const, event: (id: string) => ['events', id, 'billing'] as const };

export function useEventBilling(eventId: string | null, enabled = true) {
    return useQuery({
        queryKey: billingKeys.event(eventId ?? ''),
        queryFn: () => api.get<EventBillingResponseDto>(endpoints.events.billing(eventId!)),
        enabled: Boolean(eventId) && enabled,
        refetchInterval: (query) => {
            const data = query.state.data;
            if (!enabled) return false;
            const pending = data?.orders.filter((order) => order.status === 'PENDING');
            // No data yet: keep polling. There is a pending order: poll until the
            // order itself is old enough to count as stuck. The order's createdAt
            // is the only clock here that survives a refetch or a reload.
            if (!pending) return 5000;
            if (pending.length === 0) return false;
            const newest = Math.max(...pending.map((order) => Date.parse(order.createdAt) || 0));
            return Date.now() - newest > PENDING_ORDER_POLL_TIMEOUT_MS ? false : 5000;
        },
    });
}

export function useCheckout(eventId: string, subscription = false) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: () =>
            api.post<CheckoutResponseDto>(subscription ? endpoints.events.subscriptionCheckout(eventId) : endpoints.events.checkout(eventId)),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: billingKeys.event(eventId) });
            queryClient.invalidateQueries({ queryKey: ['events', eventId] });
        },
    });
}

export function useUpgradeCheckout(eventId: string) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (input: UpgradeCheckoutRequestDto) => api.post<CheckoutResponseDto>(endpoints.events.upgradeCheckout(eventId), input),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: billingKeys.event(eventId) });
            queryClient.invalidateQueries({ queryKey: usageKeys.event(eventId) });
            queryClient.invalidateQueries({ queryKey: appConfigKeys.all });
        },
    });
}

export function useStorageCheckout(eventId: string) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (input: StorageCheckoutRequestDto) => api.post<CheckoutResponseDto>(endpoints.events.storageCheckout(eventId), input),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: billingKeys.event(eventId) });
            queryClient.invalidateQueries({ queryKey: usageKeys.event(eventId) });
        },
    });
}

export function useAddEventAddon(eventId: string) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (input: EventAddonRequestDto) => api.post<EventAddonDto>(endpoints.events.addons(eventId), input),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: billingKeys.event(eventId) });
            queryClient.invalidateQueries({ queryKey: ['events', eventId] });
        },
    });
}

// DELETE /api/events/{id}/subscription — stops the renewal, does not refund and
// does not end the paid month. Idempotent, so a second press is harmless.
// The response is the whole truth: never set `cancelAtPeriodEnd` optimistically,
// because a 502 (5027) means the card is still being charged.
export function useCancelSubscription(eventId: string) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: () => api.del<SubscriptionSummaryDto>(endpoints.events.subscription(eventId)),
        onSuccess: (subscription) => {
            queryClient.setQueryData<EventBillingResponseDto>(billingKeys.event(eventId), (previous) =>
                previous ? { ...previous, subscription } : previous
            );
            queryClient.invalidateQueries({ queryKey: billingKeys.event(eventId) });
        },
    });
}

export function useRefundEligibility(eventId: string | null) {
    return useQuery({
        queryKey: ['events', eventId, 'refund-eligibility'],
        queryFn: () => api.get<RefundEligibilityResponseDto>(endpoints.events.refundEligibility(eventId!)),
        enabled: Boolean(eventId),
    });
}

// GET /api/events/{id}/refund-requests — the host's own history. Sorted newest
// first so the current request is [0]; without this the decision, its note and
// `providerRefunded` would only ever be visible in the tab that submitted it.
export function useEventRefundRequests(eventId: string | null) {
    return useQuery({
        queryKey: ['events', eventId, 'refund-requests'],
        queryFn: () => api.get<RefundRequestResponseDto[]>(endpoints.events.refundRequests(eventId!)),
        enabled: Boolean(eventId),
        select: (requests) => [...requests].sort((left, right) => right.requestedAt.localeCompare(left.requestedAt)),
    });
}

export function useRequestRefund(eventId: string) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (reason: string) => api.post<RefundRequestResponseDto>(endpoints.events.refundRequests(eventId), { reason }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['events', eventId] });
            queryClient.invalidateQueries({ queryKey: ['events', eventId, 'refund-eligibility'] });
            queryClient.invalidateQueries({ queryKey: ['events', eventId, 'refund-requests'] });
            queryClient.invalidateQueries({ queryKey: billingKeys.event(eventId) });
        },
    });
}
