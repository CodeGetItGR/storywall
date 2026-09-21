'use client';

import { useMutation, useQueries, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';

import { adminKeys } from '@/hooks/useAdmin';
import { appConfigKeys } from '@/hooks/useAppConfig';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { PlanTierModuleConfigDto, PlanTierModuleConfigPatchDto } from '@/lib/api/types';

// One GET /api/admin/plan-tiers/{id}/modules per plan column, in parallel. A
// failed column is reported on its own so the rest of the grid stays usable.
export function usePlanModuleConfigs(planIds: string[]) {
    const results = useQueries({
        queries: planIds.map((planId) => ({
            queryKey: adminKeys.planTierModuleConfigs(planId),
            queryFn: () => api.get<PlanTierModuleConfigDto[]>(endpoints.admin.planTiers.modules(planId)),
        })),
    });

    const configsByPlanId = useMemo(() => {
        const map = new Map<string, PlanTierModuleConfigDto[]>();
        results.forEach((result, index) => {
            if (result.data) map.set(planIds[index], result.data);
        });
        return map;
    }, [planIds, results]);

    const failedPlanIds = useMemo(() => planIds.filter((_planId, index) => Boolean(results[index]?.error)), [planIds, results]);

    return {
        configsByPlanId,
        failedPlanIds,
        isLoading: results.some((result) => result.isLoading),
    };
}

export function useUpdatePlanModuleConfig() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ planId, moduleKey, input }: { planId: string; moduleKey: string; input: PlanTierModuleConfigPatchDto }) =>
            api.patch<PlanTierModuleConfigDto>(endpoints.admin.planTiers.moduleConfig(planId, moduleKey), input),
        onSuccess: (_result, { planId }) => {
            queryClient.invalidateQueries({ queryKey: adminKeys.planTierModuleConfigs(planId) });
            queryClient.invalidateQueries({ queryKey: appConfigKeys.all });
        },
    });
}
