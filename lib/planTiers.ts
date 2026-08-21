import type { ModuleKey, PlanScope, PlanTierResponseDto } from '@/lib/api/types';
import { discountedAmountMinor, isPlanDiscountActive } from '@/lib/billing';
import { formatBytes } from '@/lib/format';

export function scopedPlans(plans: PlanTierResponseDto[], scope: PlanScope): PlanTierResponseDto[] {
    return plans.filter((plan) => plan.scope === scope).sort((left, right) => left.sortOrder - right.sortOrder);
}

export type PlanPriceKind = 'activation' | 'recurring';

export interface PlanPriceDetails {
    amountMinor: number;
    listAmountMinor: number;
    currency: string;
    discountActive: boolean;
    discountLabel: string | null;
}

export function formatPlanMoney(plan: PlanTierResponseDto, locale?: string): string | null {
    return formatPlanAmount(plan, 'activation', locale);
}

export function formatPlanRecurringMoney(plan: PlanTierResponseDto, locale?: string): string | null {
    return formatPlanAmount(plan, 'recurring', locale);
}

export function getPlanPriceDetails(plan: PlanTierResponseDto, kind: PlanPriceKind): PlanPriceDetails | null {
    const listAmountMinor = kind === 'activation' ? plan.priceAmountMinor : plan.recurringPriceAmountMinor;
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

function formatPlanAmount(plan: PlanTierResponseDto, kind: PlanPriceKind, locale?: string): string | null {
    const price = getPlanPriceDetails(plan, kind);
    return price ? new Intl.NumberFormat(locale, { style: 'currency', currency: price.currency }).format(price.amountMinor / 100) : null;
}

export function formatLimitValue(value: number | null, unit: 'bytes' | 'count'): string | null {
    if (value === null) return null;
    return unit === 'bytes' ? formatBytes(value) : value.toLocaleString();
}

export function publicAssignablePlans(plans: PlanTierResponseDto[], scope: PlanScope): PlanTierResponseDto[] {
    return scopedPlans(plans, scope).filter((plan) => plan.isAssignable && plan.isPublic);
}

export function findPlanByCode(plans: PlanTierResponseDto[], scope: PlanScope, code: string): PlanTierResponseDto | undefined {
    return publicAssignablePlans(plans, scope).find((plan) => plan.code === code);
}

export function findNextPlan(plans: PlanTierResponseDto[], scope: PlanScope, code: string): PlanTierResponseDto | undefined {
    const scopedPlans = publicAssignablePlans(plans, scope);
    const currentIndex = scopedPlans.findIndex((plan) => plan.code === code);
    if (currentIndex < 0) return scopedPlans[0];
    return scopedPlans[currentIndex + 1];
}

export function findPlansUnlockingModule(plans: PlanTierResponseDto[], moduleKey: ModuleKey): PlanTierResponseDto[] {
    return publicAssignablePlans(plans, 'EVENT').filter((plan) => plan.moduleKeys.includes(moduleKey));
}
