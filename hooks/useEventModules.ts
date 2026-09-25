import { useQuery } from '@tanstack/react-query';

import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import { normalizeList } from '@/lib/api/pagination';
import type { EventModuleResponseDto } from '@/lib/api/types';

export const eventModuleKeys = {
    list: (eventId: string) => ['events', eventId, 'modules'] as const,
};

// GET /api/events/{eventId}/modules — which modules the event has. Any
// member of the event. Read-only: modules follow the plan and unlocks, so
// there is no host toggle (plan-owned-modules-fe-integration.md).
export function useEventModules(eventId: string | null) {
    const { isAuthenticated } = useAuth();

    return useQuery({
        queryKey: eventModuleKeys.list(eventId ?? ''),
        queryFn: async () => {
            const res = await api.get<EventModuleResponseDto[]>(endpoints.events.modules(eventId!));
            return normalizeList(res).items;
        },
        enabled: Boolean(eventId) && isAuthenticated,
    });
}
