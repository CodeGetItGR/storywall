'use client';

import { useMemo } from 'react';

import { useAppConfig } from '@/hooks/useAppConfig';
import { useLocalizedAppEventTypeCopy } from '@/hooks/useLocalizedAppEventTypeCopy';
import { useLocalizedText } from '@/hooks/useLocalizedText';
import { usePlanMarketingCopy } from '@/hooks/usePlanMarketingCopy';
import type { EventTypeConvention } from '@/lib/api/types';
import { eventTypeSlug } from '@/lib/eventTypeSlug';
import { resolveLandingCategoryPlans } from '@/lib/landingCategories';
import { buildLandingRow, cheapestLandingPrice, type LandingPlan } from '@/lib/landingPricing';
import { qrPagePlans, splitLitePlans } from '@/lib/planTiers';

// One event type in the landing pricing picker. id is its LANDING_EVENT_PARAM value. plans are the full
// plans; litePlans (no posts) are their own row behind the teaser, with liteFromPrice their cheapest price.
// qrPagePlans is the QR wedding page's row (see qrPagePlans in lib/planTiers.ts).
export type LandingPricingEventType = {
    id: string;
    eventTypeKey: EventTypeConvention;
    label: string;
    plans: LandingPlan[];
    litePlans: LandingPlan[];
    liteFromPrice: string | null;
    qrPagePlans: LandingPlan[];
};
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
                    // Each row rolls a card up into the previous one in it ("Everything in X"). A type with
                    // only lite plans shows them as its plans, with no teaser.
                    const split = splitLitePlans(plans);
                    const hasFull = split.full.length > 0;
                    const row = (rowPlans: typeof plans) =>
                        buildLandingRow(rowPlans, data.modules, data.media, moduleName, copy, data.memberRolesByEventType).map(
                            (entry) => entry.presentation,
                        );
                    const landingPlans = row(hasFull ? split.full : split.lite);
                    if (landingPlans.length === 0) return [];
                    const litePlans = hasFull ? row(split.lite) : [];
                    return [
                        {
                            id: eventTypeSlug(eventTypeKey),
                            eventTypeKey,
                            label: eventTypeCopy(eventTypeKey).name,
                            plans: landingPlans,
                            litePlans,
                            liteFromPrice: litePlans.length > 0 ? cheapestLandingPrice(split.lite) : null,
                            qrPagePlans: row(qrPagePlans(plans)),
                        },
                    ];
                });
                return { id: category.id, isDefault: category.isDefault, label: localizedText(category.name), items };
            })
            .filter((group) => group.items.length > 0);

        const defaultEventTypeId = (groups.find((group) => group.isDefault) ?? groups[0])?.items[0]?.id ?? null;
        return { groups: groups.map(({ isDefault: _isDefault, ...group }) => group), defaultEventTypeId };
    }, [data, copy, moduleName, localizedText, eventTypeCopy]);
}
