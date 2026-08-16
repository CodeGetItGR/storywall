import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRef } from 'react';

import { myEventsKeys } from '@/hooks/useMyEvents';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { CheckoutResponseDto, EventDetailResponseDto, EventPatchDto, EventRequestDto, EventResponseDto } from '@/lib/api/types';

export const eventKeys = {
    all: ['events'] as const,
    detail: (id: string) => ['events', id] as const,
};

// GET /api/events/{id} returns the grouped/enriched detail shape (schedule,
// location, hosts, modules, sessions, rsvpSummary) — not the flat
// EventResponseDto used by the list and create endpoints.
export function useEvent(eventId: string | null) {
    return useQuery({
        queryKey: eventKeys.detail(eventId ?? ''),
        queryFn: () => api.get<EventDetailResponseDto>(endpoints.events.byId(eventId!)),
        enabled: Boolean(eventId),
    });
}

// Batch variant of useEvent, for screens (like the profile/home page) that
// need title/cover for every event a user belongs to at once. Shares the
// same eventKeys.detail cache entries as useEvent, so a membership whose
// feed the user already visited is served from cache. Order-preserving:
// result[i] corresponds to eventIds[i].
export function useEventDetails(eventIds: string[]) {
    return useQueries({
        queries: eventIds.map((id) => ({
            queryKey: eventKeys.detail(id),
            queryFn: () => api.get<EventDetailResponseDto>(endpoints.events.byId(id)),
        })),
    });
}

// POST /api/events — USER only. The backend is assumed to attach the caller
// as a HOST member of the new event (there's no separate "become host" step
// documented), so we just invalidate /api/me/events and let the caller pick
// the freshly created event up from there.
export function useCreateEvent() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (input: EventRequestDto) => api.post<EventResponseDto>(endpoints.events.list, input),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: myEventsKeys.all });
        },
    });
}

// Creation and activation checkout are one user action. Retain the draft when
// checkout opening fails so a retry cannot create duplicate events.
export function useCreateEventCheckout() {
    const queryClient = useQueryClient();
    const draftRef = useRef<EventResponseDto | null>(null);

    return useMutation({
        mutationFn: async (input: EventRequestDto) => {
            if (!draftRef.current) {
                draftRef.current = await api.post<EventResponseDto>(endpoints.events.list, input);
                await queryClient.invalidateQueries({ queryKey: myEventsKeys.all });
            }

            const checkout = await api.post<CheckoutResponseDto>(endpoints.events.checkout(draftRef.current.id));
            return { checkout, event: draftRef.current };
        },
        onSuccess: ({ event }) => {
            queryClient.invalidateQueries({ queryKey: eventKeys.detail(event.id) });
            queryClient.invalidateQueries({ queryKey: ['events', event.id, 'billing'] });
        },
    });
}

// PATCH /api/events/{id} — HOST of the event only. Partial update, no
// eventType (not editable server-side, see integration guide §8).
export function useUpdateEvent(eventId: string | null) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (input: EventPatchDto) => api.patch<EventResponseDto>(endpoints.events.byId(eventId!), input),
        onSuccess: (event) => {
            queryClient.invalidateQueries({ queryKey: eventKeys.detail(event.id) });
            queryClient.invalidateQueries({ queryKey: myEventsKeys.all });
            queryClient.invalidateQueries({ queryKey: ['events', event.id, 'billing'] });
        },
    });
}
