import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/hooks/useAuth';
import { eventKeys } from '@/hooks/useEvent';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import { normalizeList } from '@/lib/api/pagination';
import type { EventSessionPatchDto, EventSessionRequestDto, EventSessionResponseDto } from '@/lib/api/types';

// Sub-events within a multi-day event (e.g. "rehearsal dinner", "ceremony").
// Not to be confused with the auth device Session in useSessions.ts.
export const eventSessionKeys = {
    list: (eventId: string) => ['events', eventId, 'sessions'] as const,
};

// GET /api/events/{eventId}/sessions — any member of the event, non-deleted only.
export function useEventSessions(eventId: string | null) {
    const { isAuthenticated } = useAuth();

    return useQuery({
        queryKey: eventSessionKeys.list(eventId ?? ''),
        queryFn: async () => {
            const res = await api.get<EventSessionResponseDto[]>(endpoints.events.sessions(eventId!));
            return normalizeList(res).items;
        },
        enabled: Boolean(eventId) && isAuthenticated,
    });
}

// POST /api/event-sessions — HOST of dto.eventId.
export function useCreateEventSession() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (input: EventSessionRequestDto) => api.post<EventSessionResponseDto>(endpoints.eventSessions.create, input),
        onSuccess: (session) => {
            queryClient.invalidateQueries({ queryKey: eventSessionKeys.list(session.eventId) });
            queryClient.invalidateQueries({ queryKey: eventKeys.detail(session.eventId) });
        },
    });
}

export function useUpdateEventSession(id: string, eventId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (input: EventSessionPatchDto) => api.patch<EventSessionResponseDto>(endpoints.eventSessions.byId(id), input),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: eventSessionKeys.list(eventId) });
            queryClient.invalidateQueries({ queryKey: eventKeys.detail(eventId) });
        },
    });
}

export function useDeleteEventSession(eventId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: string) => api.del<void>(endpoints.eventSessions.byId(id)),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: eventSessionKeys.list(eventId) });
            queryClient.invalidateQueries({ queryKey: eventKeys.detail(eventId) });
        },
    });
}
