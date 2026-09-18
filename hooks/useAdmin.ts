import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { appConfigKeys } from '@/hooks/useAppConfig';
import { notificationKeys } from '@/hooks/useNotifications';
import { usageKeys } from '@/hooks/useUsage';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { Page } from '@/lib/api/pagination';
import type {
    CalendarSummaryResponseDto,
    CollaborationCodePatchDto,
    CollaborationCodeRequestDto,
    CollaborationCodeResponseDto,
    CollaborationEarningResponseDto,
    CollaborationEarningsTotalDto,
    CollaboratorPortalTokenResponseDto,
    CollaboratorRequestDto,
    CollaboratorResponseDto,
    CostSummaryResponseDto,
    DiscountCodePatchDto,
    DiscountCodeRequestDto,
    DiscountCodeResponseDto,
    EventDashboardRowDto,
    EventUsageResponseDto,
    LinkDiscountCodeRequestDto,
    MarkCollaborationEarningsPaidRequestDto,
    ModuleKey,
    NotificationSweepResponseDto,
    PaidServiceKind,
    PaidServiceResponseDto,
    PlanAssignmentRequestDto,
    PlanScope,
    PlanTierDuplicateRequestDto,
    PlanTierPatchDto,
    PlanTierRequestDto,
    PlanTierResponseDto,
    PlanTimelineRowDto,
    PlatformEventTypePatchDto,
    PlatformEventTypeResponseDto,
    PlatformMetricsResponseDto,
    PlatformModulePatchDto,
    PlatformModuleResponseDto,
    ReactionTypeResponseDto,
    UnprocessedWebhookDto,
    VoidCollaborationRedemptionRequestDto,
    WithdrawalAdminDto,
    WithdrawalResponseDto,
    WithdrawalWithholdRequestDto,
} from '@/lib/api/types';

export const adminKeys = {
    all: ['admin'] as const,
    planTiers: (scope?: PlanScope, includeArchived?: boolean) => ['admin', 'plan-tiers', scope ?? 'ALL', Boolean(includeArchived)] as const,
    platformModules: ['admin', 'platform-modules'] as const,
    platformEventTypes: ['admin', 'platform-event-types'] as const,
    unprocessedWebhooks: ['admin', 'webhooks', 'unprocessed'] as const,
    notificationSweep: ['admin', 'notifications', 'sweep'] as const,
    withdrawals: ['admin', 'withdrawals'] as const,
    metrics: ['admin', 'metrics'] as const,
    costSummary: ['admin', 'metrics', 'cost-summary'] as const,
    costTimeline: (weeks: number) => ['admin', 'metrics', 'timeline', weeks] as const,
    costCalendar: (since: string, until: string) => ['admin', 'metrics', 'calendar', since, until] as const,
    costCalendarDayEvents: (date: string, page: number, size: number) => ['admin', 'metrics', 'calendar', date, 'events', page, size] as const,
    paidServices: (kind?: PaidServiceKind, includeArchived?: boolean) => ['admin', 'paid-services', kind ?? 'ALL', Boolean(includeArchived)] as const,
    collaborators: ['admin', 'collaborators'] as const,
    collaboratorCodes: (id: string) => ['admin', 'collaborators', id, 'codes'] as const,
    discountCodes: ['admin', 'discount-codes'] as const,
    collaboratorEarnings: (id: string) => ['admin', 'collaborators', id, 'earnings'] as const,
    collaboratorEarningsTotals: (id: string) => ['admin', 'collaborators', id, 'earnings', 'totals'] as const,
    reactionTypes: (eventTypeKey?: string, includeArchived?: boolean) =>
        ['admin', 'reaction-types', eventTypeKey ?? 'ALL', Boolean(includeArchived)] as const,
};

export function useAdminCollaborators() {
    return useQuery({
        queryKey: adminKeys.collaborators,
        queryFn: () => api.get<CollaboratorResponseDto[]>(endpoints.admin.collaborators.list),
    });
}

export function useSaveCollaborator() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, input }: { id?: string; input: CollaboratorRequestDto }) =>
            id
                ? api.patch<CollaboratorResponseDto>(endpoints.admin.collaborators.byId(id), input)
                : api.post<CollaboratorResponseDto>(endpoints.admin.collaborators.list, input),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: adminKeys.collaborators });
        },
    });
}

export function useIssueCollaboratorPortalToken() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: string) => api.post<CollaboratorPortalTokenResponseDto>(endpoints.admin.collaborators.portalToken(id)),
        onSuccess: (_token, id) => {
            queryClient.invalidateQueries({ queryKey: adminKeys.collaborators });
            queryClient.invalidateQueries({ queryKey: ['admin', 'collaborators', id] });
        },
    });
}

export function useCollaboratorCodes(collaboratorId: string | null) {
    return useQuery({
        queryKey: adminKeys.collaboratorCodes(collaboratorId ?? ''),
        queryFn: () => api.get<CollaborationCodeResponseDto[]>(endpoints.admin.collaborators.codes(collaboratorId!)),
        enabled: Boolean(collaboratorId),
    });
}

export function useSaveCollaborationCode(collaboratorId: string | null) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, input }: { id?: string; input: CollaborationCodeRequestDto | CollaborationCodePatchDto }) =>
            id
                ? api.patch<CollaborationCodeResponseDto>(endpoints.admin.collaborationCodes.byId(id), input)
                : api.post<CollaborationCodeResponseDto>(endpoints.admin.collaborators.codes(collaboratorId!), input),
        onSuccess: () => {
            if (collaboratorId) queryClient.invalidateQueries({ queryKey: adminKeys.collaboratorCodes(collaboratorId) });
        },
    });
}

export function useAdminDiscountCodes() {
    return useQuery({
        queryKey: adminKeys.discountCodes,
        queryFn: () => api.get<DiscountCodeResponseDto[]>(endpoints.admin.discountCodes.list),
    });
}

export function useSaveDiscountCode() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, input }: { id?: string; input: DiscountCodeRequestDto | DiscountCodePatchDto }) =>
            id
                ? api.patch<DiscountCodeResponseDto>(endpoints.admin.discountCodes.byId(id), input)
                : api.post<DiscountCodeResponseDto>(endpoints.admin.discountCodes.list, input),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: adminKeys.discountCodes });
        },
    });
}

export function useLinkDiscountCodeToCollaborator(collaboratorId: string | null) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (input: LinkDiscountCodeRequestDto) =>
            api.post<CollaborationCodeResponseDto>(endpoints.admin.collaborators.linkCode(collaboratorId!), input),
        onSuccess: () => {
            if (collaboratorId) queryClient.invalidateQueries({ queryKey: adminKeys.collaboratorCodes(collaboratorId) });
            queryClient.invalidateQueries({ queryKey: adminKeys.discountCodes });
        },
    });
}

export function useCollaboratorEarnings(collaboratorId: string | null) {
    return useQuery({
        queryKey: adminKeys.collaboratorEarnings(collaboratorId ?? ''),
        queryFn: () => api.get<CollaborationEarningResponseDto[]>(endpoints.admin.collaborators.earnings(collaboratorId!)),
        enabled: Boolean(collaboratorId),
    });
}

export function useCollaboratorEarningsTotals(collaboratorId: string | null) {
    return useQuery({
        queryKey: adminKeys.collaboratorEarningsTotals(collaboratorId ?? ''),
        queryFn: () => api.get<CollaborationEarningsTotalDto[]>(endpoints.admin.collaborators.earningsTotals(collaboratorId!)),
        enabled: Boolean(collaboratorId),
    });
}

export function useMarkCollaborationEarningsPaid(collaboratorId: string | null) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (input: MarkCollaborationEarningsPaidRequestDto) => api.post<void>(endpoints.admin.collaborationEarnings.markPaid, input),
        onSuccess: () => {
            if (!collaboratorId) return;
            queryClient.invalidateQueries({ queryKey: adminKeys.collaboratorEarnings(collaboratorId) });
            queryClient.invalidateQueries({ queryKey: adminKeys.collaboratorEarningsTotals(collaboratorId) });
        },
    });
}

export function useVoidCollaborationRedemption() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ eventId, input }: { eventId: string; input: VoidCollaborationRedemptionRequestDto }) =>
            api.post<void>(endpoints.admin.events.collaborationRedemptionVoid(eventId), input),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: adminKeys.collaborators });
            queryClient.invalidateQueries({ queryKey: ['admin', 'collaborators'] });
            queryClient.invalidateQueries({ queryKey: ['billing'] });
        },
    });
}

// GET /api/admin/metrics - live platform dashboard counts.
export function useAdminMetrics() {
    return useQuery({
        queryKey: adminKeys.metrics,
        queryFn: () => api.get<PlatformMetricsResponseDto>(endpoints.admin.metrics.snapshot),
    });
}

export function useAdminCostSummary() {
    return useQuery({
        queryKey: adminKeys.costSummary,
        queryFn: () => api.get<CostSummaryResponseDto>(endpoints.admin.metrics.costSummary),
    });
}

export function useAdminCostTimeline(weeks: number) {
    return useQuery({
        queryKey: adminKeys.costTimeline(weeks),
        queryFn: () => api.get<PlanTimelineRowDto[]>(endpoints.admin.metrics.timeline(weeks)),
    });
}

export function useAdminCostCalendar({ since, until }: { since: string; until: string }) {
    return useQuery({
        queryKey: adminKeys.costCalendar(since, until),
        queryFn: () => api.get<CalendarSummaryResponseDto>(endpoints.admin.metrics.calendar(since, until)),
    });
}

export function useAdminCostCalendarDayEvents({ date, page, size }: { date: string | null; page: number; size: number }) {
    return useQuery({
        queryKey: adminKeys.costCalendarDayEvents(date ?? '', page, size),
        queryFn: () => api.get<Page<EventDashboardRowDto>>(endpoints.admin.metrics.calendarDayEvents(date!, page, size)),
        enabled: Boolean(date),
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

// GET /api/admin/withdrawals — the queue of HELD requests, each with the full
// facts sheet the automated decision was based on (guide §9).
export function useAdminWithdrawals() {
    return useQuery({
        queryKey: adminKeys.withdrawals,
        queryFn: () => api.get<WithdrawalAdminDto[]>(endpoints.admin.withdrawals.list),
    });
}

// POST /api/admin/withdrawals/{id}/release — no body. Refunds at the price
// computed at request time and deletes the event, same outcome as an automatic
// REFUNDED. 409 WITHDRAWAL_NOT_HELD if the request isn't currently HELD.
export function useReleaseWithdrawal() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (requestId: string) => api.post<WithdrawalResponseDto>(endpoints.admin.withdrawals.release(requestId)),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: adminKeys.withdrawals });
            queryClient.invalidateQueries({ queryKey: ['events'] });
            queryClient.invalidateQueries({ queryKey: ['billing'] });
            queryClient.invalidateQueries({ queryKey: adminKeys.metrics });
        },
    });
}

// POST /api/admin/withdrawals/{id}/withhold — note is required and shown to the
// host verbatim. Also suspends the host's account — not a soft decline.
export function useWithholdWithdrawal() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ requestId, note }: { requestId: string; note: string }) => {
            const body: WithdrawalWithholdRequestDto = { note };
            return api.post<WithdrawalResponseDto>(endpoints.admin.withdrawals.withhold(requestId), body);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: adminKeys.withdrawals });
            queryClient.invalidateQueries({ queryKey: ['events'] });
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

// POST /api/admin/plan-tiers/{id}/duplicate — clones a source plan into one or
// more new plans for other event types in a single call. Replaces the old
// PUT .../event-types "create + restrict" flow entirely. See
// plan-tiers-by-event-type-fe-integration.md §5.
export function useDuplicatePlanTier() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ planId, clones }: { planId: string; clones: PlanTierDuplicateRequestDto['clones'] }) =>
            api.post<PlanTierResponseDto[]>(endpoints.admin.planTiers.duplicate(planId), { clones }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: adminKeys.planTiers('EVENT', true) });
            queryClient.invalidateQueries({ queryKey: appConfigKeys.all });
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

function reactionTypesPath(eventTypeKey: string, includeArchived?: boolean): string {
    const searchParams = new URLSearchParams({ eventTypeKey });
    if (includeArchived) searchParams.set('includeArchived', 'true');
    return `${endpoints.admin.reactionTypes.list}?${searchParams.toString()}`;
}

export function useAdminReactionTypes(eventTypeKey: string | undefined, includeArchived = false) {
    return useQuery({
        queryKey: adminKeys.reactionTypes(eventTypeKey, includeArchived),
        queryFn: () => api.get<ReactionTypeResponseDto[]>(reactionTypesPath(eventTypeKey!, includeArchived)),
        enabled: Boolean(eventTypeKey),
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
