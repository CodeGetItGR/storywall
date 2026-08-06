import { useQuery } from '@tanstack/react-query';

import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { AccountUsageResponseDto, EventUsageResponseDto } from '@/lib/api/types';

export const usageKeys = {
    me: ['me', 'usage'] as const,
    event: (eventId: string) => ['events', eventId, 'usage'] as const,
};

export function useMeUsage() {
    return useQuery({
        queryKey: usageKeys.me,
        queryFn: () => api.get<AccountUsageResponseDto>(endpoints.me.usage),
    });
}

export function useEventUsage(eventId: string | null) {
    return useQuery({
        queryKey: usageKeys.event(eventId ?? ''),
        queryFn: () => api.get<EventUsageResponseDto>(endpoints.events.usage(eventId!)),
        enabled: Boolean(eventId),
    });
}
