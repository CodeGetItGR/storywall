import { type QueryClient, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/hooks/useAuth';
import { eventKeys } from '@/hooks/useEvent';
import { useModuleReadable } from '@/hooks/useModuleReadable';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import { normalizeList } from '@/lib/api/pagination';
import type { EventDetailResponseDto, EventSessionPatchDto, EventSessionRequestDto, EventSessionResponseDto } from '@/lib/api/types';

// Sub-events within a multi-day event (e.g. "rehearsal dinner", "ceremony").
// Not to be confused with the auth device Session in useSessions.ts.
export const eventSessionKeys = {
    list: (eventId: string) => ['events', eventId, 'sessions'] as const,
};

// GET /api/events/{eventId}/sessions — any member of the event, non-deleted only.
export function useEventSessions(eventId: string | null) {
    const queryClient = useQueryClient();
    const { isAuthenticated } = useAuth();
    const scheduleReadable = useModuleReadable(eventId, 'schedule');

    return useQuery({
        queryKey: eventSessionKeys.list(eventId ?? ''),
        queryFn: async () => {
            const res = await api.get<EventSessionResponseDto[]>(endpoints.events.sessions(eventId!));
            return normalizeList(res).items;
        },
        // The event detail embeds this same list when the schedule is readable, so a page that has
        // already loaded the event doesn't fetch it again; it counts as exactly as fresh as the detail.
        initialData: () =>
            eventId ? (queryClient.getQueryData<EventDetailResponseDto>(eventKeys.detail(eventId))?.sessions ?? undefined) : undefined,
        initialDataUpdatedAt: () => (eventId ? queryClient.getQueryState(eventKeys.detail(eventId))?.dataUpdatedAt : undefined),
        enabled: Boolean(eventId) && isAuthenticated && scheduleReadable,
    });
}

// The event embeds its sessions, and the RSVP reports count attendance per
// session, so both refresh with the list. Only the event itself (exact): its
// other queries — posts, media, members — don't change with the schedule.
function refreshAfterSessionChange(queryClient: QueryClient, eventId: string) {
    queryClient.invalidateQueries({ queryKey: eventSessionKeys.list(eventId) });
    queryClient.invalidateQueries({ queryKey: eventKeys.detail(eventId), exact: true });
    // rsvpKeys.report's prefix, spelled out because useRsvps imports this file.
    queryClient.invalidateQueries({ queryKey: ['events', eventId, 'rsvps', 'report'] });
}

// POST /api/event-sessions — HOST of dto.eventId.
export function useCreateEventSession() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (input: EventSessionRequestDto) => api.post<EventSessionResponseDto>(endpoints.eventSessions.create, input),
        onSuccess: (session) => refreshAfterSessionChange(queryClient, session.eventId),
    });
}

export function useUpdateEventSession(id: string, eventId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (input: EventSessionPatchDto) => api.patch<EventSessionResponseDto>(endpoints.eventSessions.byId(id), input),
        onSuccess: () => refreshAfterSessionChange(queryClient, eventId),
    });
}

export function useDeleteEventSession(eventId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: string) => api.del<void>(endpoints.eventSessions.byId(id)),
        onSuccess: () => refreshAfterSessionChange(queryClient, eventId),
    });
}
