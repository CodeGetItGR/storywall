import { useMutation, useQueryClient } from '@tanstack/react-query';

import { eventKeys } from '@/hooks/useEvent';
import { myEventsKeys } from '@/hooks/useMyEvents';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { EventDeletionRequestDto, EventResponseDto } from '@/lib/api/types';

function invalidateEventDeletionQueries(queryClient: ReturnType<typeof useQueryClient>, eventId: string) {
    queryClient.invalidateQueries({ queryKey: eventKeys.detail(eventId) });
    queryClient.invalidateQueries({ queryKey: myEventsKeys.all });
}

// POST /api/events/{eventId}/deletion-requests/otp — primary host only.
// Sends a short-lived six-digit confirmation code to the primary host.
export function useRequestEventDeletionOtp(eventId: string) {
    return useMutation({
        mutationFn: () => api.post<void>(endpoints.events.deletionRequestOtp(eventId)),
    });
}

// POST /api/events/{eventId}/deletion-requests — primary host only, confirmed
// with the latest OTP. The response is flat, while the detail cache is grouped,
// so invalidate both event entry points rather than writing it into the cache.
export function useRequestEventDeletion(eventId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (input: EventDeletionRequestDto) => api.post<EventResponseDto>(endpoints.events.deletionRequests(eventId), input),
        onSuccess: () => {
            invalidateEventDeletionQueries(queryClient, eventId);
        },
    });
}

// DELETE on the same resource cancels a pending deletion. Any event host can
// restore it, including a co-host who could not initiate the deletion.
export function useCancelEventDeletion(eventId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: () => api.del<EventResponseDto>(endpoints.events.deletionRequests(eventId)),
        onSuccess: () => {
            invalidateEventDeletionQueries(queryClient, eventId);
        },
    });
}
