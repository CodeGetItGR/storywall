import type { CoverageOptionResponseDto, EventTypeConvention, ModuleKey, PlanScope, PlanTierResponseDto } from '@/lib/api/types';
import { discountedAmountMinor, isPlanDiscountActive } from '@/lib/billing';
import { formatBytes } from '@/lib/format';

export function scopedPlans(plans: PlanTierResponseDto[], scope: PlanScope): PlanTierResponseDto[] {
    return plans.filter((plan) => plan.scope === scope).sort((left, right) => left.sortOrder - right.sortOrder);
}

export interface PlanPriceDetails {
    amountMinor: number;
    listAmountMinor: number;
    currency: string;
    discountActive: boolean;
    discountLabel: string | null;
}

// The durations an EVENT plan is on sale at, in display order. Admin responses
// also carry retired ones; public responses only ever list live ones.
export function liveInitialOptions(plan: PlanTierResponseDto): CoverageOptionResponseDto[] {
    return plan.initialOptions
        .filter((option) => option.active)
        .toSorted((left, right) => left.sortOrder - right.sortOrder || left.months - right.months);
}

// The duration a host has picked on this plan, or the shortest when they
// haven't picked one (or picked one that is no longer on sale).
export function resolveInitialOption(plan: PlanTierResponseDto, optionId: string | null | undefined): CoverageOptionResponseDto | null {
    return liveInitialOptions(plan).find((option) => option.id === optionId) ?? shortestInitialOption(plan);
}

export function cheapestInitialOption(plan: PlanTierResponseDto): CoverageOptionResponseDto | null {
    return liveInitialOptions(plan).reduce<CoverageOptionResponseDto | null>(
        (cheapest, option) => (!cheapest || option.priceAmountMinor < cheapest.priceAmountMinor ? option : cheapest),
        null,
    );
}

// What the server falls back to when an event is created without a duration.
export function shortestInitialOption(plan: PlanTierResponseDto): CoverageOptionResponseDto | null {
    return liveInitialOptions(plan).reduce<CoverageOptionResponseDto | null>(
        (shortest, option) => (!shortest || option.months < shortest.months ? option : shortest),
        null,
    );
}

export function formatPlanMoney(plan: PlanTierResponseDto, locale?: string): string | null {
    return formatPlanAmount(plan, locale);
}

// One duration's price, after the plan's own promotion. Every option is priced
// in the plan's currency.
export function getOptionPriceDetails(plan: PlanTierResponseDto, option: CoverageOptionResponseDto): PlanPriceDetails | null {
    return priceDetails(plan, option.priceAmountMinor);
}

// An EVENT plan has no price of its own: this is its cheapest live duration,
// for "from" labels. An ACCOUNT plan still carries a single price.
export function getPlanPriceDetails(plan: PlanTierResponseDto): PlanPriceDetails | null {
    if (plan.scope === 'EVENT') {
        const cheapest = cheapestInitialOption(plan);
        return cheapest ? priceDetails(plan, cheapest.priceAmountMinor) : null;
    }
    return priceDetails(plan, plan.priceAmountMinor);
}

function priceDetails(plan: PlanTierResponseDto, listAmountMinor: number | null): PlanPriceDetails | null {
    if (listAmountMinor === null || !plan.priceCurrency) return null;

    const discountActive = isPlanDiscountActive(plan);
    return {
        amountMinor: discountedAmountMinor(listAmountMinor, plan),
        listAmountMinor,
        currency: plan.priceCurrency,
        discountActive,
        discountLabel: plan.discountLabel,
    };
}

function formatPlanAmount(plan: PlanTierResponseDto, locale?: string): string | null {
    const price = getPlanPriceDetails(plan);
    return price ? new Intl.NumberFormat(locale, { style: 'currency', currency: price.currency }).format(price.amountMinor / 100) : null;
}

export function formatLimitValue(value: number | null, unit: 'bytes' | 'count'): string | null {
    if (value === null) return null;
    return unit === 'bytes' ? formatBytes(value) : value.toLocaleString();
}

export function publicAssignablePlans(plans: PlanTierResponseDto[], scope: PlanScope): PlanTierResponseDto[] {
    return scopedPlans(plans, scope).filter((plan) => plan.isAssignable && plan.isPublic);
}

// Cheapest price (after any active discount) among the public EVENT plans for
// one event type. null when the type has no priced plan.
export function lowestEventTypePlanPrice(plans: PlanTierResponseDto[], eventTypeKey: EventTypeConvention): PlanPriceDetails | null {
    return publicAssignablePlans(plans, 'EVENT')
        .filter((plan) => plan.eventTypeKey === eventTypeKey)
        .map(getPlanPriceDetails)
        .reduce<PlanPriceDetails | null>((lowest, price) => (price && (!lowest || price.amountMinor < lowest.amountMinor) ? price : lowest), null);
}

export function findPlanByCode(plans: PlanTierResponseDto[], scope: PlanScope, code: string): PlanTierResponseDto | undefined {
    return publicAssignablePlans(plans, scope).find((plan) => plan.code === code);
}

// The plan an "upgrade to X" hint names. An EVENT plan has no price of its own,
// so it is the next plan of the same event type in catalog order that is on
// sale. An ACCOUNT plan is the first dearer one in the same currency.
export function findNextPlan(plans: PlanTierResponseDto[], scope: PlanScope, code: string): PlanTierResponseDto | undefined {
    const currentPlan = scopedPlans(plans, scope).find((plan) => plan.code === code);
    if (!currentPlan) return undefined;

    if (scope === 'EVENT') {
        return publicAssignablePlans(plans, 'EVENT').find(
            (plan) => plan.eventTypeKey === currentPlan.eventTypeKey && plan.sortOrder > currentPlan.sortOrder && liveInitialOptions(plan).length > 0,
        );
    }

    const currentPriceAmountMinor = currentPlan.priceAmountMinor;
    const currentPriceCurrency = currentPlan.priceCurrency;
    if (currentPriceAmountMinor === null || !currentPriceCurrency) return undefined;

    return publicAssignablePlans(plans, scope).find(
        (plan) =>
            plan.code !== currentPlan.code &&
            plan.priceCurrency === currentPriceCurrency &&
            plan.priceAmountMinor !== null &&
            plan.priceAmountMinor > currentPriceAmountMinor,
    );
}

export function findPlansUnlockingModule(plans: PlanTierResponseDto[], moduleKey: ModuleKey): PlanTierResponseDto[] {
    return publicAssignablePlans(plans, 'EVENT').filter((plan) => plan.moduleKeys.includes(moduleKey));
}
