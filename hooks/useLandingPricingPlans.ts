'use client';

import { useMemo } from 'react';

import { useAppConfig } from '@/hooks/useAppConfig';
import { useLocalizedText } from '@/hooks/useLocalizedText';
import { usePlanMarketingCopy } from '@/hooks/usePlanMarketingCopy';
import type { PlanTierResponseDto } from '@/lib/api/types';
import { resolveLandingCategoryPlans } from '@/lib/landingCategories';
import { buildLandingPlan, type LandingPlan } from '@/lib/landingPricing';

export type LandingPricingTab = { id: string; label: string; description: string; plans: LandingPlan[] };
type LandingPricingTabs = { tabs: LandingPricingTab[] | null; defaultTabId: string | null };

// Tabs from /api/config.landingCategories, in order; a tab with no plan to show is left out. The
// default tab is the one marked isDefault if it survived, else the first.
export function useLandingPricingPlans(): LandingPricingTabs {
    const { data } = useAppConfig();
    const { copy, moduleName } = usePlanMarketingCopy();
    const localizedText = useLocalizedText();

    return useMemo(() => {
        if (!data) return { tabs: null, defaultTabId: null };

        const tabs = (data.landingCategories ?? [])
            .map((category) => {
                // Only plans that get a card come back (see isLandingPlanOnSale).
                const { plans } = resolveLandingCategoryPlans(data.planTiers, category.eventTypeKeys, data.memberRolesByEventType);
                // "Everything in X" rolls up the previous card of the same event type: the first
                // card of each type lists its own features in full. A merged shared-group card
                // counts as its representative's type, which is the plan shown.
                const landingPlans: LandingPlan[] = [];
                for (const [index, plan] of plans.entries()) {
                    const sameTypeBefore: PlanTierResponseDto[] = plans
                        .slice(0, index)
                        .filter((previousPlan) => previousPlan.eventTypeKey === plan.eventTypeKey);
                    const landingPlan = buildLandingPlan(
                        plan,
                        sameTypeBefore.at(-1),
                        data.modules,
                        data.media,
                        moduleName,
                        copy,
                        sameTypeBefore.flatMap((previousPlan) => previousPlan.moduleKeys),
                        data.memberRolesByEventType,
                    );
                    if (landingPlan !== null) landingPlans.push(landingPlan);
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
    }, [data, copy, moduleName, localizedText]);
}
