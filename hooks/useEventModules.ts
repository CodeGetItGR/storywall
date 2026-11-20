import { useQuery } from '@tanstack/react-query';

import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import { normalizeList } from '@/lib/api/pagination';
import type { EventModuleResponseDto } from '@/lib/api/types';

export const eventModuleKeys = {
    list: (eventId: string) => ['events', eventId, 'modules'] as const,
};

export async function fetchEventModules(eventId: string): Promise<EventModuleResponseDto[]> {
    const res = await api.get<EventModuleResponseDto[]>(endpoints.events.modules(eventId));
    return normalizeList(res).items;
}

// GET /api/events/{eventId}/modules — which modules the event has. Any
// member of the event. Read-only: modules follow the plan and unlocks, so
// there is no host toggle (plan-owned-modules-fe-integration.md).
export function useEventModules(eventId: string | null) {
    const { isAuthenticated } = useAuth();

    return useQuery({
        queryKey: eventModuleKeys.list(eventId ?? ''),
        queryFn: () => fetchEventModules(eventId!),
        enabled: Boolean(eventId) && isAuthenticated,
    });
}
