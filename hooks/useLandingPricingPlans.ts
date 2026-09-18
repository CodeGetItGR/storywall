'use client';

import { useTranslations } from 'next-intl';

import { useAppConfig } from '@/hooks/useAppConfig';
import {
    buildLandingPlan,
    LANDING_PRICING_CATEGORY_EVENT_TYPES,
    type LandingPlan,
    type LandingPlanCopy,
    type LandingPricingCategoryKey,
    resolveLandingCategoryPlans,
} from '@/lib/landingPricing';

export type LandingPricingCategories = Record<LandingPricingCategoryKey, { label: string; plans: LandingPlan[] }>;

const CATEGORY_KEYS = Object.keys(LANDING_PRICING_CATEGORY_EVENT_TYPES) as LandingPricingCategoryKey[];

export function useLandingPricingPlans(): { categories: LandingPricingCategories | null } {
    const t = useTranslations('LandingPage.pricing');
    const tModules = useTranslations('Modules');
    const { data } = useAppConfig();

    if (!data) return { categories: null };

    const moduleName = (moduleKey: string) => (tModules.has(`${moduleKey}.name`) ? tModules(`${moduleKey}.name`) : moduleKey);
    const copy: LandingPlanCopy = {
        accessMonths: (months) => t('accessMonths', { months }),
        accessUnlimited: t('accessUnlimited'),
        baselineFeatures: t.raw('baselineFeatures') as string[],
        everythingIn: (planName) => t('everythingIn', { plan: planName }),
        guestsUnlimited: t('guestsUnlimited'),
        guestsUpTo: (count) => t('guestsUpTo', { count }),
        mediaUnlimited: t('mediaUnlimited'),
        storageUnlimited: t('storageUnlimited'),
    };

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
