import { useQuery } from '@tanstack/react-query';

import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { EventUsageResponseDto } from '@/lib/api/types';

export const usageKeys = {
    event: (eventId: string) => ['events', eventId, 'usage'] as const,
};

export function useEventUsage(eventId: string | null) {
    const { isAuthenticated } = useAuth();

    return useQuery({
        queryKey: usageKeys.event(eventId ?? ''),
        queryFn: () => api.get<EventUsageResponseDto>(endpoints.events.usage(eventId!)),
        enabled: Boolean(eventId) && isAuthenticated,
    });
}
