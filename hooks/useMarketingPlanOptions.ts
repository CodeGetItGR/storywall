'use client';

import { useMemo } from 'react';

import { useMemberRoleCatalog } from '@/hooks/useAppConfig';
import { usePlanMarketingCopy } from '@/hooks/usePlanMarketingCopy';
import type { AppMediaConfigDto, PlanTierResponseDto, PlatformModuleResponseDto } from '@/lib/api/types';
import { buildLandingRow, type LandingPlan } from '@/lib/landingPricing';
import { splitLitePlans } from '@/lib/planTiers';

export type MarketingPlanOption = {
    config: PlanTierResponseDto;
    featured: boolean;
    presentation: LandingPlan;
};

type MarketingPlanOptions = {
    // The full plans, the second one featured.
    full: MarketingPlanOption[];
    // The lite plans (no posts), never featured. Empty when there are no full plans: they then show as `full`.
    lite: MarketingPlanOption[];
};

const NONE: MarketingPlanOptions = { full: [], lite: [] };

// The plans as picker cards: full and lite plans are separate rows, each rolling a card up into the previous one in it.
export function useMarketingPlanOptions({
    plans,
    modules,
    media,
}: {
    plans: PlanTierResponseDto[];
    modules: PlatformModuleResponseDto[];
    media: AppMediaConfigDto | null;
}): MarketingPlanOptions {
    const { copy, moduleName } = usePlanMarketingCopy();
    const memberRoles = useMemberRoleCatalog();

    return useMemo(() => {
        if (!media) return NONE;

        const split = splitLitePlans(plans);
        // With no full plans, the lite ones are the whole picker.
        const hasFull = split.full.length > 0;
        const row = (rowPlans: PlanTierResponseDto[], featuredIndex: number | null): MarketingPlanOption[] =>
            buildLandingRow(rowPlans, modules, media, moduleName, copy, memberRoles).map((entry, index) => ({
                ...entry,
                featured: index === featuredIndex,
            }));
        const full = row(hasFull ? split.full : split.lite, 1);
        const lite = hasFull ? row(split.lite, null) : [];
        return { full, lite };
    }, [copy, media, memberRoles, moduleName, modules, plans]);
}
