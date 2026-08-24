import { useQuery } from '@tanstack/react-query';

import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { EventUsageResponseDto } from '@/lib/api/types';

export const usageKeys = {
    event: (eventId: string) => ['events', eventId, 'usage'] as const,
};

export function useEventUsage(eventId: string | null) {
    return useQuery({
        queryKey: usageKeys.event(eventId ?? ''),
        queryFn: () => api.get<EventUsageResponseDto>(endpoints.events.usage(eventId!)),
        enabled: Boolean(eventId),
    });
}
