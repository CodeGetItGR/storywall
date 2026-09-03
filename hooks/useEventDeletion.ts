import { useMutation, useQueryClient } from '@tanstack/react-query';

import { eventKeys } from '@/hooks/useEvent';
import { myEventsKeys } from '@/hooks/useMyEvents';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { EventDeletionRequestDto, EventResponseDto } from '@/lib/api/types';

// POST /api/events/{eventId}/deletion-requests — primary host only,
// password-confirmed. Response is the flat EventResponseDto (not the nested
// EventDetailResponseDto the detail cache holds), so — same as
// useUpdateEvent — invalidate rather than setQueryData with it.
export function useRequestEventDeletion(eventId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (input: EventDeletionRequestDto) => api.post<EventResponseDto>(endpoints.events.deletionRequests(eventId), input),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: eventKeys.detail(eventId) });
            queryClient.invalidateQueries({ queryKey: myEventsKeys.all });
        },
    });
}

// DELETE /api/events/{eventId}/deletion-requests — any host, no password
// ("Undo"). A no-op 200 if nothing was pending, so it's safe to call from a
// stale button without a pre-check.
export function useCancelEventDeletion(eventId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: () => api.del<EventResponseDto>(endpoints.events.deletionRequests(eventId)),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: eventKeys.detail(eventId) });
            queryClient.invalidateQueries({ queryKey: myEventsKeys.all });
        },
    });
}
