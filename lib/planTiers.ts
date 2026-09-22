import type { EventTypeConvention, ModuleKey, PlanScope, PlanTierResponseDto } from '@/lib/api/types';
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

export function formatPlanMoney(plan: PlanTierResponseDto, locale?: string): string | null {
    return formatPlanAmount(plan, locale);
}

export function getPlanPriceDetails(plan: PlanTierResponseDto): PlanPriceDetails | null {
    const listAmountMinor = plan.priceAmountMinor;
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

export function findNextPlan(plans: PlanTierResponseDto[], scope: PlanScope, code: string): PlanTierResponseDto | undefined {
    const currentPlan = scopedPlans(plans, scope).find((plan) => plan.code === code);
    if (!currentPlan || currentPlan.priceAmountMinor === null || !currentPlan.priceCurrency) return undefined;
    const currentPriceAmountMinor = currentPlan.priceAmountMinor;
    const currentPriceCurrency = currentPlan.priceCurrency;

    return publicAssignablePlans(plans, scope).find(
        (plan) =>
            plan.code !== currentPlan.code &&
            (scope !== 'EVENT' || plan.eventTypeKey === currentPlan.eventTypeKey) &&
            plan.priceCurrency === currentPriceCurrency &&
            plan.priceAmountMinor !== null &&
            plan.priceAmountMinor > currentPriceAmountMinor
    );
}

export function findPlansUnlockingModule(plans: PlanTierResponseDto[], moduleKey: ModuleKey): PlanTierResponseDto[] {
    return publicAssignablePlans(plans, 'EVENT').filter((plan) => plan.moduleKeys.includes(moduleKey));
}
