'use client';

import { useMemo } from 'react';

import { useAppConfig } from '@/hooks/useAppConfig';
import { useLocalizedAppEventTypeCopy } from '@/hooks/useLocalizedAppEventTypeCopy';
import { useLocalizedText } from '@/hooks/useLocalizedText';
import { usePlanMarketingCopy } from '@/hooks/usePlanMarketingCopy';
import type { EventTypeConvention } from '@/lib/api/types';
import { eventTypeSlug } from '@/lib/eventTypeSlug';
import { resolveLandingCategoryPlans } from '@/lib/landingCategories';
import { buildLandingPlan, type LandingPlan } from '@/lib/landingPricing';

// One event type in the landing pricing picker. id is its LANDING_EVENT_PARAM value.
export type LandingPricingEventType = { id: string; eventTypeKey: EventTypeConvention; label: string; plans: LandingPlan[] };
// A landing category: only groups its event types in the picker. Each type shows its own plans.
export type LandingPricingGroup = { id: string; label: string; items: LandingPricingEventType[] };
type LandingPricingPlans = { groups: LandingPricingGroup[] | null; defaultEventTypeId: string | null };

// Event types from /api/config.landingCategories, grouped by category in their order; a type with no
// plan to show, and a category left with none, are left out. A type listed in two categories shows
// in the first. The default is the first type of the category marked isDefault if it survived, else
// the first type.
export function useLandingPricingPlans(): LandingPricingPlans {
    const { data } = useAppConfig();
    const { copy, moduleName } = usePlanMarketingCopy();
    const localizedText = useLocalizedText();
    const eventTypeCopy = useLocalizedAppEventTypeCopy();

    return useMemo(() => {
        if (!data) return { groups: null, defaultEventTypeId: null };

        const seen = new Set<EventTypeConvention>();
        const groups = (data.landingCategories ?? [])
            .map((category) => {
                const items = category.eventTypeKeys.flatMap((eventTypeKey): LandingPricingEventType[] => {
                    if (seen.has(eventTypeKey)) return [];
                    seen.add(eventTypeKey);
                    // Only plans that get a card come back (see isLandingPlanOnSale).
                    const { plans } = resolveLandingCategoryPlans(data.planTiers, [eventTypeKey], data.memberRolesByEventType);
                    // "Everything in X" rolls up the previous card: the first card lists its own
                    // features in full.
                    const landingPlans = plans.flatMap((plan, index) => {
                        const before = plans.slice(0, index);
                        const landingPlan = buildLandingPlan(
                            plan,
                            before.at(-1),
                            data.modules,
                            data.media,
                            moduleName,
                            copy,
                            before.flatMap((previousPlan) => previousPlan.moduleKeys),
                            data.memberRolesByEventType,
                        );
                        return landingPlan === null ? [] : [landingPlan];
                    });
                    if (landingPlans.length === 0) return [];
                    return [{ id: eventTypeSlug(eventTypeKey), eventTypeKey, label: eventTypeCopy(eventTypeKey).name, plans: landingPlans }];
                });
                return { id: category.id, isDefault: category.isDefault, label: localizedText(category.name), items };
            })
            .filter((group) => group.items.length > 0);

        const defaultEventTypeId = (groups.find((group) => group.isDefault) ?? groups[0])?.items[0]?.id ?? null;
        return { groups: groups.map(({ isDefault: _isDefault, ...group }) => group), defaultEventTypeId };
    }, [data, copy, moduleName, localizedText, eventTypeCopy]);
}
