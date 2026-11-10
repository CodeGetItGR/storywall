import { useQuery } from '@tanstack/react-query';

import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { EventTypeConvention, PlanTierResponseDto } from '@/lib/api/types';

export const planTiersByEventTypeKeys = {
    all: (eventType: string) => ['plan-tiers', 'by-event-type', eventType] as const,
};

// GET /api/plan-tiers?eventType=X — the EVENT-scope, assignable, public plans (paidModules
// included) available for that type. Public since KAN-197, so the create wizard can show plans
// before sign-up; other callers still wait for a session (allowSignedOut false).
export function usePlanTiersForEventType(eventType: EventTypeConvention | undefined, enabled = true, allowSignedOut = false) {
    const { isAuthenticated } = useAuth();

    return useQuery({
        queryKey: planTiersByEventTypeKeys.all(eventType ?? ''),
        queryFn: () => api.get<PlanTierResponseDto[]>(endpoints.planTiers.byEventType(eventType!)),
        enabled: Boolean(eventType) && enabled && (isAuthenticated || allowSignedOut),
        select: (plans) => [...plans].sort((left, right) => left.sortOrder - right.sortOrder),
        staleTime: 60 * 1000,
    });
}
