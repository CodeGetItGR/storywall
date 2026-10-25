import type { AppConfigResponseDto, EventTypeConvention } from '@/lib/api/types';
import { promotedOptionAmountMinor } from '@/lib/billing';
import { resolveLandingCategoryPlans } from '@/lib/landingCategories';
import { formatLandingOptionPrice } from '@/lib/landingPricing';
import { shortestInitialOption } from '@/lib/planTiers';

// Values for an occasion's price sentences ({range, select, …} in its copy): 'span' for two or more
// prices, 'single' for one, 'none' without config or without a plan on sale. A sentence leaves the
// prices out for 'none'.
export type OccasionPriceValues = { range: 'span' | 'single' | 'none'; from: string; fromName: string; to: string; toName: string };

const NO_PRICES: OccasionPriceValues = { range: 'none', from: '', fromName: '', to: '', toName: '' };

// The cheapest and dearest card the occasion's pricing section shows, each at the duration it opens on.
export function occasionPriceValues(config: AppConfigResponseDto | null, eventType: EventTypeConvention): OccasionPriceValues {
    if (!config) return NO_PRICES;
    const { plans } = resolveLandingCategoryPlans(config.planTiers, [eventType], config.memberRolesByEventType);
    const prices = plans
        .flatMap((plan) => {
            const option = shortestInitialOption(plan);
            const price = option ? formatLandingOptionPrice(plan, option) : null;
            return option && price ? [{ amountMinor: promotedOptionAmountMinor(option, plan), name: plan.name, price }] : [];
        })
        .sort((left, right) => left.amountMinor - right.amountMinor);
    const from = prices[0];
    const to = prices.at(-1);
    if (!from || !to) return NO_PRICES;
    return { range: from === to ? 'single' : 'span', from: from.price, fromName: from.name, to: to.price, toName: to.name };
}
