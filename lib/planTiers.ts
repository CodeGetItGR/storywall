import type { ModuleKey, PlanScope, PlanTierResponseDto } from '@/lib/api/types';

export function publicAssignablePlans(plans: PlanTierResponseDto[], scope: PlanScope): PlanTierResponseDto[] {
    return plans.filter((plan) => plan.scope === scope && plan.isAssignable && plan.isPublic).sort((left, right) => left.sortOrder - right.sortOrder);
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
