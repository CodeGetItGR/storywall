'use client';

import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';

import { appConfigKeys } from '@/hooks/useAppConfig';
import { useAuth } from '@/hooks/useAuth';
import { usageKeys } from '@/hooks/useUsage';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type {
    CheckoutRequestDto,
    CheckoutResponseDto,
    CollaborationCodePreviewRequestDto,
    CollaborationCodePreviewResponseDto,
    CreateEventCodePreviewRequestDto,
    EventAddonDto,
    EventAddonRequestDto,
    EventBillingResponseDto,
    ExtensionCheckoutRequestDto,
    ExtensionOptionResponseDto,
    OrderSummaryDto,
    PriceBreakdown,
    QuoteRequestDto,
    StorageCheckoutRequestDto,
    UpgradeCheckoutRequestDto,
    UpgradeOptionResponseDto,
    WithdrawalPreviewResponseDto,
    WithdrawalRequestDto,
    WithdrawalResponseDto,
} from '@/lib/api/types';

// The server can now legitimately refuse to settle an order (amount collected
// disagrees with the price), so a PENDING order is no longer guaranteed to
// resolve. Stop polling after this long and let the UI offer a support route
// rather than spinning forever.
const PENDING_ORDER_POLL_TIMEOUT_MS = 3 * 60 * 1000;

export const billingKeys = { all: ['billing'] as const, event: (id: string) => ['events', id, 'billing'] as const };

export function useEventBilling(eventId: string | null, enabled = true) {
    const { isAuthenticated } = useAuth();

    return useQuery({
        queryKey: billingKeys.event(eventId ?? ''),
        queryFn: () => api.get<EventBillingResponseDto>(endpoints.events.billing(eventId!)),
        enabled: Boolean(eventId) && enabled && isAuthenticated,
        refetchInterval: (query) => {
            const data = query.state.data;
            if (!enabled) return false;
            // A failed read (e.g. 403 for a co-host) won't start succeeding on its own.
            if (query.state.status === 'error') return false;
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

export const upgradeOptionsKeys = { event: (id: string) => ['events', id, 'upgrade-options'] as const };

// Fully priced upgrade targets — gap and payable amounts, discount already
// combined server-side. No rate limit of its own; safe to call per page view.
export function useUpgradeOptions(eventId: string | null, enabled = true) {
    const { isAuthenticated } = useAuth();

    return useQuery({
        queryKey: upgradeOptionsKeys.event(eventId ?? ''),
        queryFn: () => api.get<UpgradeOptionResponseDto[]>(endpoints.events.upgradeOptions(eventId!)),
        enabled: Boolean(eventId) && enabled && isAuthenticated,
    });
}

export const extensionOptionsKeys = { event: (id: string) => ['events', id, 'extension-options'] as const };

// Priced coverage extensions the event's plan sells, never discounted. An empty
// list means the plan sells none. Primary host only (403 4006 otherwise).
export function useExtensionOptions(eventId: string | null, enabled = true) {
    const { isAuthenticated } = useAuth();

    return useQuery({
        queryKey: extensionOptionsKeys.event(eventId ?? ''),
        queryFn: () => api.get<ExtensionOptionResponseDto[]>(endpoints.events.extensionOptions(eventId!)),
        enabled: Boolean(eventId) && enabled && isAuthenticated,
    });
}

export function useCheckout(eventId: string) {
    const queryClient = useQueryClient();
    return useMutation({
        // A body is required as of 2026-09 — requestsImmediateStart/acknowledgesWithdrawalTerms
        // are mandatory consent, not optional metadata (billing-fe-guide §6).
        mutationFn: (input: CheckoutRequestDto) => api.post<CheckoutResponseDto>(endpoints.events.checkout(eventId), input),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: billingKeys.event(eventId) });
            // Only the event itself (exact): without it, every query under
            // ['events', id] — posts, media, members — would refetch too.
            queryClient.invalidateQueries({ queryKey: ['events', eventId], exact: true });
        },
    });
}

export function usePreviewCollaborationCode(eventId: string) {
    return useMutation({
        mutationFn: (input: CollaborationCodePreviewRequestDto) =>
            api.post<CollaborationCodePreviewResponseDto>(endpoints.events.checkoutCodePreview(eventId), input),
    });
}

export function usePreviewCreateEventCode() {
    return useMutation({
        mutationFn: (input: CreateEventCodePreviewRequestDto) => api.post<CollaborationCodePreviewResponseDto>(endpoints.checkout.previewCode, input),
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
            queryClient.invalidateQueries({ queryKey: upgradeOptionsKeys.event(eventId) });
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

export function useExtensionCheckout(eventId: string) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (input: ExtensionCheckoutRequestDto) => api.post<CheckoutResponseDto>(endpoints.events.extensionCheckout(eventId), input),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: billingKeys.event(eventId) });
            queryClient.invalidateQueries({ queryKey: extensionOptionsKeys.event(eventId) });
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

// GET /api/events/{id}/withdrawals — the host's own history, newest first, so the
// most recent outcome (and its lines/refusals) survives a reload.
export function useEventWithdrawals(eventId: string | null, enabled = true) {
    const { isAuthenticated } = useAuth();

    return useQuery({
        queryKey: ['events', eventId, 'withdrawals'],
        queryFn: () => api.get<WithdrawalResponseDto[]>(endpoints.events.withdrawals(eventId!)),
        enabled: Boolean(eventId) && enabled && isAuthenticated,
        select: (withdrawals) => [...withdrawals].sort((left, right) => right.createdAt.localeCompare(left.createdAt)),
    });
}

export const quoteKeys = {
    all: (eventId: string) => ['events', eventId, 'quote'] as const,
    event:(eventId: string, request: QuoteRequestDto) => ['events', eventId, 'quote', request.kind, request.paidServiceCode ?? null] as const,
};

// POST /api/events/{id}/quote — read-only pricing of an activation or a storage
// pack for the review page. Redeems nothing and opens nothing, so it is a query.
// Primary host only (403 4006 otherwise).
export function useEventQuote(eventId: string, request: QuoteRequestDto | null, enabled = true) {
    const { isAuthenticated } = useAuth();

    return useQuery({
        queryKey: request ? quoteKeys.event(eventId, request) : ['events', eventId, 'quote', null],
        queryFn: () => api.post<PriceBreakdown>(endpoints.events.quote(eventId), request!),
        enabled: Boolean(eventId && request) && enabled && isAuthenticated,
    });
}

// Per-order withdrawal (withdrawal-compliance phase 2 §4). An ACTIVATION is
// withdrawn through the event endpoints, since withdrawing it withdraws the event.
export const withdrawalKeys = {
    preview: (eventId: string, orderId: string | null) => ['events', eventId, 'withdrawal-preview', orderId] as const,
    history: (eventId: string) => ['events', eventId, 'withdrawals'] as const,
};

type WithdrawalTarget = Pick<OrderSummaryDto, 'id' | 'kind'>;

function withdrawalPreviewPath(eventId: string, order: WithdrawalTarget): string {
    return order.kind === 'ACTIVATION'
        ? endpoints.events.withdrawalPreview(eventId)
        : endpoints.events.orderWithdrawalPreview(eventId, order.id);
}

export function useOrderWithdrawalPreview(eventId: string, order: WithdrawalTarget | null) {
    const { isAuthenticated } = useAuth();

    return useQuery({
        queryKey: withdrawalKeys.preview(eventId, order ? (order.kind === 'ACTIVATION' ? null : order.id) : null),
        queryFn: () => api.get<WithdrawalPreviewResponseDto>(withdrawalPreviewPath(eventId, order!)),
        enabled: Boolean(order) && isAuthenticated,
    });
}

// Orders from before V106 carry no breakdown, so only their preview says whether
// the window is still open (phase 4 §6).
export function useLegacyOrderWithdrawalPreviews(eventId: string, orders: WithdrawalTarget[], enabled: boolean) {
    const { isAuthenticated } = useAuth();

    return useQueries({
        queries: orders.map((order) => ({
            queryKey: withdrawalKeys.preview(eventId, order.kind === 'ACTIVATION' ? null : order.id),
            queryFn: () => api.get<WithdrawalPreviewResponseDto>(withdrawalPreviewPath(eventId, order)),
            enabled: enabled && isAuthenticated,
        })),
    });
}

export function useSubmitOrderWithdrawal(eventId: string) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ order, input }: { order: WithdrawalTarget; input: WithdrawalRequestDto }) =>
            api.post<WithdrawalResponseDto>(
                order.kind === 'ACTIVATION' ? endpoints.events.withdrawals(eventId) : endpoints.events.orderWithdrawals(eventId, order.id),
                input,
            ),
        onSuccess: () => {
            // A withdrawal can move coverage, storage, the plan and the orders.
            queryClient.invalidateQueries({ queryKey: ['events', eventId] });
            queryClient.invalidateQueries({ queryKey: usageKeys.event(eventId) });
        },
    });
}
