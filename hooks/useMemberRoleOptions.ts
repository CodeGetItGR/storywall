import { useQuery } from '@tanstack/react-query';

import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { MemberRoleOptionsDto } from '@/lib/api/types';

export const memberRoleOptionKeys = {
    list: (eventId: string) => ['events', eventId, 'member-roles'] as const,
};

// GET /api/events/{eventId}/member-roles — any member. Loaded only while a
// role sheet is open; holders/available are a snapshot, so always refetch.
export function useMemberRoleOptions(eventId: string | null, enabled: boolean) {
    const { isAuthenticated } = useAuth();

    return useQuery({
        queryKey: memberRoleOptionKeys.list(eventId ?? ''),
        queryFn: () => api.get<MemberRoleOptionsDto>(endpoints.events.memberRoles(eventId!)),
        enabled: Boolean(eventId) && isAuthenticated && enabled,
        staleTime: 0,
    });
}
