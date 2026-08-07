import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { appConfigKeys } from '@/hooks/useAppConfig';
import { usageKeys } from '@/hooks/useUsage';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type {
    AccountUsageResponseDto,
    EventUsageResponseDto,
    PlanAssignmentRequestDto,
    PlanModulesRequestDto,
    PlanScope,
    PlanTierPatchDto,
    PlanTierRequestDto,
    PlanTierResponseDto,
    PlatformModulePatchDto,
    PlatformModuleResponseDto,
    RefundDecisionRequestDto,
    RefundRequestAdminDto,
    RefundRequestResponseDto,
    UnprocessedWebhookDto,
} from '@/lib/api/types';

export const adminKeys = {
    all: ['admin'] as const,
    planTiers: (scope?: PlanScope, includeArchived?: boolean) => ['admin', 'plan-tiers', scope ?? 'ALL', Boolean(includeArchived)] as const,
    platformModules: ['admin', 'platform-modules'] as const,
    unprocessedWebhooks: ['admin', 'webhooks', 'unprocessed'] as const,
    refundRequests: ['admin', 'refund-requests'] as const,
};

// POST /api/admin/orders/{orderId}/settle — marks an order paid with no provider
// payment behind it (bank transfer, comped event, lost webhook) and activates the
// event exactly as a real payment would. On the MANUAL provider used in dev and
// staging this is the only way an event ever leaves DRAFT.
export function useSettleOrder() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (orderId: string) => api.post<void>(endpoints.admin.orders.settle(orderId)),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: adminKeys.unprocessedWebhooks });
            // The settled order belongs to an event whose billing/status just moved.
            queryClient.invalidateQueries({ queryKey: ['events'] });
            queryClient.invalidateQueries({ queryKey: ['billing'] });
        },
    });
}

// GET /api/admin/webhooks/unprocessed — deliveries received but never processed,
// i.e. settlements the platform may have lost. The remedy is usually settle above.
export function useUnprocessedWebhooks() {
    return useQuery({
        queryKey: adminKeys.unprocessedWebhooks,
        queryFn: () => api.get<UnprocessedWebhookDto[]>(endpoints.admin.webhooks.unprocessed),
    });
}

// GET /api/admin/refund-requests — the queue, oldest first, each row carrying the
// usage evidence the gates are derived from (guide §9). The counts include
// soft-deleted rows on purpose: the bytes were stored and paid for either way.
export function useAdminRefundRequests() {
    return useQuery({
        queryKey: adminKeys.refundRequests,
        queryFn: () => api.get<RefundRequestAdminDto[]>(endpoints.admin.refundRequests.list),
    });
}

// POST /api/admin/refund-requests/{id}/approve | /reject. Never auto-retried:
// a silently repeated approval is a second refund (guide §11).
export function useDecideRefundRequest() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ requestId, decision, note }: { requestId: string; decision: 'approve' | 'reject'; note?: string }) => {
            const path = decision === 'approve' ? endpoints.admin.refundRequests.approve(requestId) : endpoints.admin.refundRequests.reject(requestId);
            const body: RefundDecisionRequestDto = { note: note?.trim() ? note.trim() : null };
            return api.post<RefundRequestResponseDto>(path, body);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: adminKeys.refundRequests });
            // Approval reverses the order and returns the event to DRAFT.
            queryClient.invalidateQueries({ queryKey: ['events'] });
            queryClient.invalidateQueries({ queryKey: ['billing'] });
        },
    });
}

// POST /api/admin/events/{id}/freeze — forces an event read-only.
export function useFreezeEvent() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (eventId: string) => api.post<void>(endpoints.admin.events.freeze(eventId)),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['events'] });
            queryClient.invalidateQueries({ queryKey: ['billing'] });
        },
    });
}

// POST /api/admin/events/{id}/purge — DESTROYS the event's media in storage,
// irreversibly. Resolves `false` when some files could not be deleted: the event
// stays FROZEN and a later call retries, so that is a "partial" outcome to show,
// not a failure to swallow.
export function usePurgeEvent() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (eventId: string) => api.post<boolean>(endpoints.admin.events.purge(eventId)),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['events'] });
            queryClient.invalidateQueries({ queryKey: ['billing'] });
        },
    });
}

function planTiersPath(scope?: PlanScope, includeArchived?: boolean): string {
    const searchParams = new URLSearchParams();
    if (scope) searchParams.set('scope', scope);
    if (includeArchived) searchParams.set('includeArchived', 'true');
    const query = searchParams.toString();
    return query ? `${endpoints.admin.planTiers.list}?${query}` : endpoints.admin.planTiers.list;
}

export function useAdminPlanTiers(scope?: PlanScope, includeArchived = false) {
    return useQuery({
        queryKey: adminKeys.planTiers(scope, includeArchived),
        queryFn: () => api.get<PlanTierResponseDto[]>(planTiersPath(scope, includeArchived)),
    });
}

export function useCreatePlanTier() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (input: PlanTierRequestDto) => api.post<PlanTierResponseDto>(endpoints.admin.planTiers.list, input),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: adminKeys.all });
            queryClient.invalidateQueries({ queryKey: appConfigKeys.all });
        },
    });
}

export function useUpdatePlanTier() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, input }: { id: string; input: PlanTierPatchDto }) =>
            api.patch<PlanTierResponseDto>(endpoints.admin.planTiers.byId(id), input),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: adminKeys.all });
            queryClient.invalidateQueries({ queryKey: appConfigKeys.all });
        },
    });
}

export function useDeletePlanTier() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: string) => api.del<void>(endpoints.admin.planTiers.byId(id)),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: adminKeys.all });
            queryClient.invalidateQueries({ queryKey: appConfigKeys.all });
        },
    });
}

export function useSetPlanModules() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, input }: { id: string; input: PlanModulesRequestDto }) =>
            api.put<PlanTierResponseDto>(endpoints.admin.planTiers.modules(id), input),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: adminKeys.all });
            queryClient.invalidateQueries({ queryKey: appConfigKeys.all });
        },
    });
}

export function useAdminPlatformModules() {
    return useQuery({
        queryKey: adminKeys.platformModules,
        queryFn: () => api.get<PlatformModuleResponseDto[]>(endpoints.admin.platformModules.list),
    });
}

export function useUpdatePlatformModule() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ moduleKey, input }: { moduleKey: string; input: PlatformModulePatchDto }) =>
            api.patch<PlatformModuleResponseDto>(endpoints.admin.platformModules.byKey(moduleKey), input),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: adminKeys.platformModules });
            queryClient.invalidateQueries({ queryKey: appConfigKeys.all });
        },
    });
}

export function useAssignUserPlanTier() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ userId, input }: { userId: string; input: PlanAssignmentRequestDto }) =>
            api.patch<AccountUsageResponseDto>(endpoints.admin.users.planTier(userId), input),
        onSuccess: (usage) => {
            queryClient.invalidateQueries({ queryKey: usageKeys.me });
            queryClient.setQueryData(usageKeys.me, usage);
        },
    });
}

export function useAssignEventPlanTier() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ eventId, input }: { eventId: string; input: PlanAssignmentRequestDto }) =>
            api.patch<EventUsageResponseDto>(endpoints.admin.events.planTier(eventId), input),
        onSuccess: (usage) => {
            queryClient.invalidateQueries({ queryKey: usageKeys.event(usage.eventId) });
            queryClient.setQueryData(usageKeys.event(usage.eventId), usage);
            queryClient.invalidateQueries({ queryKey: appConfigKeys.all });
        },
    });
}
