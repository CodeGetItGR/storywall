import { useQuery } from '@tanstack/react-query';

import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { EventTypeConvention, PlanTierResponseDto } from '@/lib/api/types';

export const planTiersByEventTypeKeys = {
    all: (eventType: string) => ['plan-tiers', 'by-event-type', eventType] as const,
};

// GET /api/plan-tiers?eventType=X — the EVENT-scope, assignable, public plans
// (paidModules included) available for that type. Authenticated, unlike the
// full /api/config catalog. This is what step 2 of event creation should
// source its plan list from, so a plan restricted away from the chosen type
// is never offered in the first place (plan-tiers-by-event-type-fe-integration.md).
export function usePlanTiersForEventType(eventType: EventTypeConvention | undefined, enabled = true) {
    return useQuery({
        queryKey: planTiersByEventTypeKeys.all(eventType ?? ''),
        queryFn: () => api.get<PlanTierResponseDto[]>(endpoints.planTiers.byEventType(eventType!)),
        enabled: Boolean(eventType) && enabled,
        select: (plans) => [...plans].sort((left, right) => left.sortOrder - right.sortOrder),
        staleTime: 60 * 1000,
    });
}
