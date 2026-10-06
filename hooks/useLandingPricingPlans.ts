'use client';

import { useAppConfig } from '@/hooks/useAppConfig';
import { useLocalizedText } from '@/hooks/useLocalizedText';
import { usePlanMarketingCopy } from '@/hooks/usePlanMarketingCopy';
import type { PlanTierResponseDto } from '@/lib/api/types';
import { resolveLandingCategoryPlans } from '@/lib/landingCategories';
import { buildLandingPlan, type LandingPlan } from '@/lib/landingPricing';

export type LandingPricingTab = { id: string; label: string; description: string; plans: LandingPlan[] };

// Tabs from /api/config.landingCategories, in order; a tab with no plan to show is left out. The
// default tab is the one marked isDefault if it survived, else the first.
export function useLandingPricingPlans(): { tabs: LandingPricingTab[] | null; defaultTabId: string | null } {
    const { data } = useAppConfig();
    const { copy, moduleName } = usePlanMarketingCopy();
    const localizedText = useLocalizedText();

    if (!data) return { tabs: null, defaultTabId: null };

    const tabs = data.landingCategories
        .map((category) => {
            const { plans } = resolveLandingCategoryPlans(data.planTiers, category.eventTypeKeys);
            // "Everything in X" rolls up the previous card actually shown: a plan
            // buildLandingPlan drops (nothing on sale) is skipped, not inherited from.
            const shownPlans: PlanTierResponseDto[] = [];
            const landingPlans: LandingPlan[] = [];
            for (const plan of plans) {
                const landingPlan = buildLandingPlan(
                    plan,
                    shownPlans.at(-1),
                    data.modules,
                    data.media,
                    moduleName,
                    copy,
                    shownPlans.flatMap((previousPlan) => previousPlan.moduleKeys),
                    data.memberRolesByEventType,
                );
                if (landingPlan === null) continue;
                shownPlans.push(plan);
                landingPlans.push(landingPlan);
            }
            return {
                id: category.id,
                isDefault: category.isDefault,
                label: localizedText(category.name),
                description: localizedText(category.description),
                plans: landingPlans,
            };
        })
        .filter((tab) => tab.plans.length > 0);

    const defaultTabId = (tabs.find((tab) => tab.isDefault) ?? tabs[0])?.id ?? null;
    return { tabs: tabs.map(({ isDefault: _isDefault, ...tab }) => tab), defaultTabId };
}
