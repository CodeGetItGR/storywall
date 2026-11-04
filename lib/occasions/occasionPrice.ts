import type { Locale } from '@/i18n/config';
import type { AppConfigResponseDto, EventTypeConvention } from '@/lib/api/types';
import { promotedOptionAmountMinor } from '@/lib/billing';
import { resolveLandingCategoryPlans } from '@/lib/landingCategories';
import { formatLandingOptionPrice } from '@/lib/landingPricing';
import { liveInitialOptions, splitLitePlans } from '@/lib/planTiers';

// Values for an occasion's price sentences ({range, select, …} in its copy): 'span' for two or more
// prices, 'single' for one, 'none' without config or without a plan on sale. A sentence leaves the
// prices out for 'none'.
export type OccasionPriceValues = { range: 'span' | 'single' | 'none'; from: string; fromName: string; to: string; toName: string };

const NO_PRICES: OccasionPriceValues = { range: 'none', from: '', fromName: '', to: '', toName: '' };

// The cheapest and dearest price the occasion's pricing section sells, across its full plans and every duration.
export function occasionPriceValues(config: AppConfigResponseDto | null, eventType: EventTypeConvention, locale: Locale): OccasionPriceValues {
    if (!config) return NO_PRICES;
    const { plans } = resolveLandingCategoryPlans(config.planTiers, [eventType], config.memberRolesByEventType);
    const prices = splitLitePlans(plans)
        .full.flatMap((plan) =>
            liveInitialOptions(plan).flatMap((option) => {
                const price = formatLandingOptionPrice(plan, option, locale);
                return price ? [{ amountMinor: promotedOptionAmountMinor(option, plan), name: plan.name, price }] : [];
            }),
        )
        .sort((left, right) => left.amountMinor - right.amountMinor);
    const from = prices[0];
    const to = prices.at(-1);
    if (!from || !to) return NO_PRICES;
    return { range: from === to ? 'single' : 'span', from: from.price, fromName: from.name, to: to.price, toName: to.name };
}

// The cheapest price, formatted, among the event type's plans that include the gallery (lite ones too),
// for the QR page. Empty when no plan has it.
export function photoPlansFromPrice(config: AppConfigResponseDto | null, eventType: EventTypeConvention, locale: Locale): string {
    if (!config) return '';
    const { plans } = resolveLandingCategoryPlans(config.planTiers, [eventType], config.memberRolesByEventType);
    const cheapest = plans
        .filter((plan) => plan.moduleKeys.includes('gallery'))
        .flatMap((plan) =>
            liveInitialOptions(plan).flatMap((option) => {
                const price = formatLandingOptionPrice(plan, option, locale);
                return price ? [{ amountMinor: promotedOptionAmountMinor(option, plan), price }] : [];
            }),
        )
        .sort((left, right) => left.amountMinor - right.amountMinor)[0];
    return cheapest?.price ?? '';
}
