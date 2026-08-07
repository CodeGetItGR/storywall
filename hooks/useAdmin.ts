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
} from '@/lib/api/types';

export const adminKeys = {
    all: ['admin'] as const,
    planTiers: (scope?: PlanScope, includeArchived?: boolean) => ['admin', 'plan-tiers', scope ?? 'ALL', Boolean(includeArchived)] as const,
    platformModules: ['admin', 'platform-modules'] as const,
};

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
