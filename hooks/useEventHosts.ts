import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import { normalizeList } from '@/lib/api/pagination';
import type { EventHostPatchDto, EventHostRequestDto, EventHostResponseDto } from '@/lib/api/types';

export const eventHostKeys = {
    list: (eventId: string) => ['events', eventId, 'hosts'] as const,
    detail: (id: string) => ['event-hosts', id] as const,
};

// GET /api/events/{eventId}/hosts — any member of the event.
export function useEventHosts(eventId: string | null) {
    const { isAuthenticated } = useAuth();

    return useQuery({
        queryKey: eventHostKeys.list(eventId ?? ''),
        queryFn: async () => {
            const res = await api.get<EventHostResponseDto[]>(endpoints.events.hosts(eventId!));
            return normalizeList(res).items;
        },
        enabled: Boolean(eventId) && isAuthenticated,
    });
}

// POST /api/event-hosts — HOST of dto.eventId.
export function useCreateEventHost() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (input: EventHostRequestDto) => api.post<EventHostResponseDto>(endpoints.eventHosts.create, input),
        onSuccess: (host) => {
            queryClient.invalidateQueries({ queryKey: eventHostKeys.list(host.eventId) });
        },
    });
}

// PATCH /api/events/{eventId}/hosts/{id} — HOST of the event. Note the
// route is nested (unlike GET/POST/DELETE, which are flat /api/event-hosts/{id})
// — the backend validates eventId against the host row's actual event.
export function useUpdateEventHost(eventId: string, id: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (input: EventHostPatchDto) => api.patch<EventHostResponseDto>(endpoints.events.hostById(eventId, id), input),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: eventHostKeys.list(eventId) });
        },
    });
}

export function useDeleteEventHost(eventId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: string) => api.del<void>(endpoints.eventHosts.byId(id)),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: eventHostKeys.list(eventId) });
        },
    });
}
