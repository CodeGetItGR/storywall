import { useQuery } from '@tanstack/react-query';

import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import { normalizeList } from '@/lib/api/pagination';
import type { EventMemberResponseDto } from '@/lib/api/types';

export const myEventsKeys = {
    all: ['me', 'events'] as const,
};

// GET /api/me/events — "which events does the current user belong to",
// the entry point for populating the event switcher on login.
export function useMyEvents() {
    const { isAuthenticated } = useAuth();

    return useQuery({
        queryKey: myEventsKeys.all,
        queryFn: async () => {
            const res = await api.get<EventMemberResponseDto[]>(endpoints.me.events);
            return normalizeList(res).items;
        },
        enabled: isAuthenticated,
    });
}
