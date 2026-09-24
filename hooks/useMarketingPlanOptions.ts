'use client';

import { useMemo } from 'react';

import { usePlanMarketingCopy } from '@/hooks/usePlanMarketingCopy';
import type { AppMediaConfigDto, PlanTierResponseDto, PlatformModuleResponseDto } from '@/lib/api/types';
import { buildLandingPlan, type LandingPlan } from '@/lib/landingPricing';

export type MarketingPlanOption = {
    config: PlanTierResponseDto;
    featured: boolean;
    presentation: LandingPlan;
};

export function useMarketingPlanOptions({
    plans,
    modules,
    media,
}: {
    plans: PlanTierResponseDto[];
    modules: PlatformModuleResponseDto[];
    media: AppMediaConfigDto | null;
}): MarketingPlanOption[] {
    const { copy, moduleName } = usePlanMarketingCopy();

    return useMemo(() => {
        if (!media) return [];

        return plans.flatMap((plan, index) => {
            const presentation = buildLandingPlan(
                plan,
                plans[index - 1],
                modules,
                media,
                moduleName,
                copy,
                plans.slice(0, index).flatMap((previousPlan) => previousPlan.moduleKeys),
            );
            return presentation ? [{ config: plan, featured: index === 1, presentation }] : [];
        });
    }, [copy, media, moduleName, modules, plans]);
}
