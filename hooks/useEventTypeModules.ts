import { useQuery } from '@tanstack/react-query';

import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { EventTypeConvention, EventTypeModuleResponseDto } from '@/lib/api/types';

export const eventTypeModuleKeys = {
    list: (eventTypeKey: string, planTierCode?: string) => ['event-types', eventTypeKey, 'modules', planTierCode ?? null] as const,
};

// GET /api/event-types/{eventTypeKey}/modules — the event type's own module
// defaults (applicability, defaultConfig e.g. schedule's maxSections), fetched
// live rather than cached on the event. Omit planTierCode for a type-only read
// (e.g. a live cap check); pass it to also resolve `includedInPlan` for a
// specific plan (e.g. the creation wizard's module-preview step). See
// event-lifecycle-locks-and-event-types-fe-integration.md §3.
export function useEventTypeModules(eventTypeKey: EventTypeConvention | undefined, planTierCode?: string) {
    const { isAuthenticated } = useAuth();

    return useQuery({
        queryKey: eventTypeModuleKeys.list(eventTypeKey ?? '', planTierCode),
        queryFn: () => api.get<EventTypeModuleResponseDto[]>(endpoints.eventTypes.modules(eventTypeKey!, planTierCode)),
        enabled: Boolean(eventTypeKey) && isAuthenticated,
        staleTime: 60 * 1000,
    });
}
