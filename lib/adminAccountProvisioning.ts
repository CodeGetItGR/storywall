import { endpoints } from '@/lib/api/endpoints';
import type { EventTypeConvention, PlanTierResponseDto } from '@/lib/api/types';
import { liveInitialOptions } from '@/lib/planTiers';

export function adminAccountsPath({ page, size, query, email }: { page: number; size: number; query?: string; email?: string }): string {
    const searchParams = new URLSearchParams({ page: String(page), size: String(size) });
    if (query?.trim()) searchParams.set('query', query.trim());
    if (email?.trim()) searchParams.set('email', email.trim());
    return `${endpoints.users.list}?${searchParams.toString()}`;
}

// A plan with no duration on sale can't be provisioned (409 COVERAGE_OPTION_UNAVAILABLE).
export function eligibleProvisioningPlans(plans: PlanTierResponseDto[], eventType: EventTypeConvention | ''): PlanTierResponseDto[] {
    return plans
        .filter((plan) => plan.scope === 'EVENT' && plan.isAssignable && plan.eventTypeKey === eventType && liveInitialOptions(plan).length > 0)
        .toSorted((left, right) => left.sortOrder - right.sortOrder);
}
