'use client';

import { useInvalidate } from '@refinedev/core';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { adminKeys } from '@/hooks/useAdmin';
import { appConfigKeys } from '@/hooks/useAppConfig';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { CoverageOptionPatchDto, CoverageOptionRequestDto, CoverageOptionResponseDto } from '@/lib/api/types';

// A plan's durations are read off the plan itself (admin plan responses carry
// every option, retired ones included), so a change refreshes the plan list
// rather than a coverage-options query of its own.
function useRefreshPlans() {
    const queryClient = useQueryClient();
    const invalidate = useInvalidate();

    return () => {
        void invalidate({ resource: 'plan-tiers', dataProviderName: 'plan-tiers', invalidates: ['list'] });
        void queryClient.invalidateQueries({ queryKey: adminKeys.planTiers('EVENT', true) });
        void queryClient.invalidateQueries({ queryKey: appConfigKeys.all });
    };
}

// POST /api/admin/plan-tiers/{planTierId}/coverage-options
export function useCreateCoverageOption() {
    const refreshPlans = useRefreshPlans();

    return useMutation({
        mutationFn: ({ planTierId, option }: { planTierId: string; option: CoverageOptionRequestDto }) =>
            api.post<CoverageOptionResponseDto>(endpoints.admin.planTiers.coverageOptions(planTierId), option),
        onSuccess: refreshPlans,
    });
}

// PATCH /api/admin/plan-tiers/{planTierId}/coverage-options/{optionId}
export function useUpdateCoverageOption() {
    const refreshPlans = useRefreshPlans();

    return useMutation({
        mutationFn: ({ planTierId, optionId, patch }: { planTierId: string; optionId: string; patch: CoverageOptionPatchDto }) =>
            api.patch<CoverageOptionResponseDto>(endpoints.admin.planTiers.coverageOption(planTierId, optionId), patch),
        onSuccess: refreshPlans,
    });
}
