'use client';

import { useLocale } from 'next-intl';
import { useMemo } from 'react';

import { useMemberRoleCatalog } from '@/hooks/useAppConfig';
import { useCampaignPriceClock } from '@/hooks/useCampaignPriceClock';
import { usePlanMarketingCopy } from '@/hooks/usePlanMarketingCopy';
import type { Locale } from '@/i18n/config';
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
    plans: allPlans,
    modules,
    media,
}: {
    plans: PlanTierResponseDto[];
    modules: PlatformModuleResponseDto[];
    media: AppMediaConfigDto | null;
}): MarketingPlanOptions {
    const { copy, moduleName } = usePlanMarketingCopy();
    const memberRoles = useMemberRoleCatalog();
    const locale = useLocale() as Locale;
    // Prices change when a campaign starts or ends, so the cards are rebuilt then.
    const plans = useCampaignPriceClock(allPlans) ?? allPlans;

    return useMemo(() => {
        if (!media) return NONE;

        const split = splitLitePlans(plans);
        // With no full plans, the lite ones are the whole picker.
        const hasFull = split.full.length > 0;
        const row = (rowPlans: PlanTierResponseDto[], featuredIndex: number | null): MarketingPlanOption[] =>
            buildLandingRow(rowPlans, modules, media, moduleName, copy, locale, memberRoles).map((entry, index) => ({
                ...entry,
                featured: index === featuredIndex,
            }));
        const full = row(hasFull ? split.full : split.lite, 1);
        const lite = hasFull ? row(split.lite, null) : [];
        return { full, lite };
    }, [copy, locale, media, memberRoles, moduleName, modules, plans]);
}
