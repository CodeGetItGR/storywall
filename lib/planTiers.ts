import type { ModuleKey, PlanScope, PlanTierResponseDto } from '@/lib/api/types';
import { formatBytes } from '@/lib/format';

export function scopedPlans(plans: PlanTierResponseDto[], scope: PlanScope): PlanTierResponseDto[] {
    return plans.filter((plan) => plan.scope === scope).sort((left, right) => left.sortOrder - right.sortOrder);
}

export function formatPlanMoney(plan: PlanTierResponseDto): string | null {
    return formatPlanAmount(plan.priceAmountMinor, plan.priceCurrency);
}

export function formatPlanRecurringMoney(plan: PlanTierResponseDto): string | null {
    return formatPlanAmount(plan.recurringPriceAmountMinor, plan.priceCurrency);
}

function formatPlanAmount(amountMinor: number | null, currency: string | null): string | null {
    if (amountMinor === null || !currency) return null;
    return new Intl.NumberFormat(undefined, {
        style: 'currency',
        currency,
    }).format(amountMinor / 100);
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
