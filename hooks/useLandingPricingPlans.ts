'use client';

import { useTranslations } from 'next-intl';

import { useAppConfig } from '@/hooks/useAppConfig';
import { usePlanMarketingCopy } from '@/hooks/usePlanMarketingCopy';
import {
    buildLandingPlan,
    LANDING_PRICING_CATEGORY_EVENT_TYPES,
    type LandingPlan,
    type LandingPricingCategoryKey,
    resolveLandingCategoryPlans,
} from '@/lib/landingPricing';

export type LandingPricingCategories = Record<LandingPricingCategoryKey, { label: string; plans: LandingPlan[] }>;

const CATEGORY_KEYS = Object.keys(LANDING_PRICING_CATEGORY_EVENT_TYPES) as LandingPricingCategoryKey[];

export function useLandingPricingPlans(): { categories: LandingPricingCategories | null } {
    const t = useTranslations('LandingPage.pricing');
    const { data } = useAppConfig();
    const { copy, moduleName } = usePlanMarketingCopy();

    if (!data) return { categories: null };

    const categories = CATEGORY_KEYS.reduce<LandingPricingCategories>((result, category) => {
        const plans = resolveLandingCategoryPlans(data.planTiers, category);
        const landingPlans = plans
            .map((plan, index) => buildLandingPlan(plan, plans[index - 1], data.modules, data.media, moduleName, copy))
            .filter((plan): plan is LandingPlan => plan !== null);
        result[category] = { label: t(`categories.${category}.label`), plans: landingPlans };
        return result;
    }, {} as LandingPricingCategories);

    return { categories };
}
