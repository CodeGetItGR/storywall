import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { appConfigKeys } from '@/hooks/useAppConfig';
import { notificationKeys } from '@/hooks/useNotifications';
import { usageKeys } from '@/hooks/useUsage';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type {
    EventTypeConvention,
    EventUsageResponseDto,
    ModuleKey,
    NotificationSweepResponseDto,
    PaidServiceKind,
    PaidServiceResponseDto,
    PlanAssignmentRequestDto,
    PlanScope,
    PlanTierPatchDto,
    PlanTierRequestDto,
    PlanTierResponseDto,
    PlatformEventTypePatchDto,
    PlatformEventTypeResponseDto,
    PlatformMetricsResponseDto,
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
    platformEventTypes: ['admin', 'platform-event-types'] as const,
    unprocessedWebhooks: ['admin', 'webhooks', 'unprocessed'] as const,
    notificationSweep: ['admin', 'notifications', 'sweep'] as const,
    refundRequests: ['admin', 'refund-requests'] as const,
    metrics: ['admin', 'metrics'] as const,
    paidServices: (kind?: PaidServiceKind, includeArchived?: boolean) => ['admin', 'paid-services', kind ?? 'ALL', Boolean(includeArchived)] as const,
};

// GET /api/admin/metrics - live platform dashboard counts.
export function useAdminMetrics() {
    return useQuery({
        queryKey: adminKeys.metrics,
        queryFn: () => api.get<PlatformMetricsResponseDto>(endpoints.admin.metrics),
    });
}

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
            queryClient.invalidateQueries({ queryKey: adminKeys.metrics });
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

export function useReplayWebhook() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ provider, providerEventId }: { provider: string; providerEventId: string }) =>
            api.post<void>(endpoints.admin.webhooks.replay(provider, providerEventId)),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: adminKeys.unprocessedWebhooks });
            queryClient.invalidateQueries({ queryKey: ['events'] });
            queryClient.invalidateQueries({ queryKey: ['billing'] });
        },
    });
}

// POST /api/admin/notifications/sweep — runs the same quota/tip notification
// rules as the scheduler. It is deduplicated server-side, so unchanged data
// usually returns zeros after the first run.
export function useRunNotificationSweep() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: () => api.post<NotificationSweepResponseDto>(endpoints.admin.notifications.sweep),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: notificationKeys.all });
            queryClient.invalidateQueries({ queryKey: notificationKeys.unreadCount });
        },
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
            const path =
                decision === 'approve' ? endpoints.admin.refundRequests.approve(requestId) : endpoints.admin.refundRequests.reject(requestId);
            const body: RefundDecisionRequestDto = { note: note?.trim() ? note.trim() : null };
            return api.post<RefundRequestResponseDto>(path, body);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: adminKeys.refundRequests });
            // Approval reverses the order and returns the event to DRAFT.
            queryClient.invalidateQueries({ queryKey: ['events'] });
            queryClient.invalidateQueries({ queryKey: ['billing'] });
            queryClient.invalidateQueries({ queryKey: adminKeys.metrics });
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
            queryClient.invalidateQueries({ queryKey: adminKeys.metrics });
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
            queryClient.invalidateQueries({ queryKey: adminKeys.metrics });
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

export function useSetPlanEventTypes() {
    const queryClient = useQueryClient();
    const plansKey = adminKeys.planTiers('EVENT', true);

    return useMutation({
        mutationFn: ({ planId, eventTypeKeys }: { planId: string; eventTypeKeys: EventTypeConvention[] }) =>
            api.put<PlanTierResponseDto>(endpoints.admin.planTiers.eventTypes(planId), { eventTypeKeys }),
        onMutate: async ({ planId, eventTypeKeys }) => {
            await queryClient.cancelQueries({ queryKey: plansKey });
            const previousPlans = queryClient.getQueryData<PlanTierResponseDto[]>(plansKey);
            queryClient.setQueryData<PlanTierResponseDto[]>(plansKey, (plans = []) =>
                plans.map((plan) => (plan.id === planId ? { ...plan, eventTypeKeys } : plan))
            );
            return { previousPlans };
        },
        onError: (_error, _variables, context) => {
            if (context?.previousPlans) queryClient.setQueryData(plansKey, context.previousPlans);
        },
        onSuccess: (updatedPlan) => {
            queryClient.setQueryData<PlanTierResponseDto[]>(plansKey, (plans = []) =>
                plans.map((plan) => (plan.id === updatedPlan.id ? updatedPlan : plan))
            );
            queryClient.invalidateQueries({ queryKey: appConfigKeys.all });
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: plansKey });
        },
    });
}

export function useSetPlanModules() {
    const queryClient = useQueryClient();
    const plansKey = adminKeys.planTiers('EVENT', true);

    return useMutation({
        mutationFn: ({ planId, moduleKeys }: { planId: string; moduleKeys: ModuleKey[] }) =>
            api.put<PlanTierResponseDto>(endpoints.admin.planTiers.modules(planId), { moduleKeys }),
        onMutate: async ({ planId, moduleKeys }) => {
            await queryClient.cancelQueries({ queryKey: plansKey });
            const previousPlans = queryClient.getQueryData<PlanTierResponseDto[]>(plansKey);
            queryClient.setQueryData<PlanTierResponseDto[]>(plansKey, (plans = []) =>
                plans.map((plan) => (plan.id === planId ? { ...plan, moduleKeys } : plan))
            );
            return { previousPlans };
        },
        onError: (_error, _variables, context) => {
            if (context?.previousPlans) queryClient.setQueryData(plansKey, context.previousPlans);
        },
        onSuccess: (updatedPlan) => {
            queryClient.setQueryData<PlanTierResponseDto[]>(plansKey, (plans = []) =>
                plans.map((plan) => (plan.id === updatedPlan.id ? updatedPlan : plan))
            );
            queryClient.invalidateQueries({ queryKey: appConfigKeys.all });
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: plansKey });
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

function paidServicesPath(kind?: PaidServiceKind, includeArchived?: boolean): string {
    const searchParams = new URLSearchParams();
    if (kind) searchParams.set('kind', kind);
    if (includeArchived) searchParams.set('includeArchived', 'true');
    const query = searchParams.toString();
    return query ? `${endpoints.admin.paidServices.list}?${query}` : endpoints.admin.paidServices.list;
}

export function useAdminPaidServices(kind?: PaidServiceKind, includeArchived = false) {
    return useQuery({
        queryKey: adminKeys.paidServices(kind, includeArchived),
        queryFn: () => api.get<PaidServiceResponseDto[]>(paidServicesPath(kind, includeArchived)),
    });
}

export function useDeletePaidService() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => api.del<void>(endpoints.admin.paidServices.byId(id)),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: adminKeys.all });
            queryClient.invalidateQueries({ queryKey: appConfigKeys.all });
        },
    });
}

export function useRemoveEventAddon() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ eventId, code }: { eventId: string; code: string }) => api.del<void>(endpoints.admin.events.addon(eventId, code)),
        onSuccess: (_, { eventId }) => {
            queryClient.invalidateQueries({ queryKey: ['events', eventId, 'billing'] });
            queryClient.invalidateQueries({ queryKey: ['billing'] });
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

export function useAdminPlatformEventTypes() {
    return useQuery({
        queryKey: adminKeys.platformEventTypes,
        queryFn: () => api.get<PlatformEventTypeResponseDto[]>(endpoints.admin.platformEventTypes.list),
    });
}

export function useUpdatePlatformEventType() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ eventTypeKey, input }: { eventTypeKey: string; input: PlatformEventTypePatchDto }) =>
            api.patch<PlatformEventTypeResponseDto>(endpoints.admin.platformEventTypes.byKey(eventTypeKey), input),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: adminKeys.platformEventTypes });
            queryClient.invalidateQueries({ queryKey: appConfigKeys.all });
        },
    });
}

// There is no account-plan assignment hook: PATCH /api/admin/users/{id}/plan-tier
// always answers 409 ACCOUNT_PLANS_DISABLED, so the console does not offer it.
export function useAssignEventPlanTier() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ eventId, input }: { eventId: string; input: PlanAssignmentRequestDto }) =>
            api.patch<EventUsageResponseDto>(endpoints.admin.events.planTier(eventId), input),
        onSuccess: (usage) => {
            queryClient.invalidateQueries({ queryKey: usageKeys.event(usage.eventId) });
            queryClient.setQueryData(usageKeys.event(usage.eventId), usage);
            queryClient.invalidateQueries({ queryKey: appConfigKeys.all });
            queryClient.invalidateQueries({ queryKey: adminKeys.metrics });
        },
    });
}
