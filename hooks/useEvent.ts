import { useMutation, useQueries, useQuery, useQueryClient, type UseQueryResult } from '@tanstack/react-query';

import { usePresignedUrlRefreshMs } from '@/hooks/useAppConfig';
import { useAuth } from '@/hooks/useAuth';
import { billingKeys, extensionOptionsKeys, quoteKeys, upgradeOptionsKeys } from '@/hooks/useBilling';
import { myEventsKeys } from '@/hooks/useMyEvents';
import { usageKeys } from '@/hooks/useUsage';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { EventDetailResponseDto, EventPatchDto, EventRequestDto, EventResponseDto } from '@/lib/api/types';

export const eventKeys = {
    all: ['events'] as const,
    detail: (id: string) => ['events', id] as const,
};

// GET /api/events/{id} returns the grouped/enriched detail shape (schedule,
// location, hosts, modules, sessions, rsvpSummary) — not the flat
// EventResponseDto used by the list and create endpoints.
export function useEvent(eventId: string | null) {
    const { isAuthenticated } = useAuth();
    // coverMedia is presigned.
    const staleTime = usePresignedUrlRefreshMs();

    return useQuery({
        queryKey: eventKeys.detail(eventId ?? ''),
        queryFn: () => api.get<EventDetailResponseDto>(endpoints.events.byId(eventId!)),
        enabled: Boolean(eventId) && isAuthenticated,
        staleTime,
    });
}

export interface EventDetailState {
    data: EventDetailResponseDto | undefined;
    isLoading: boolean;
}

// Keeps only what the event grids read. TanStack keeps the combined array's
// identity until one of these values changes, so memos built on it hold
// between renders (a plain useQueries result is a new array every render).
function combineEventDetails(results: UseQueryResult<EventDetailResponseDto>[]): EventDetailState[] {
    return results.map(({ data, isLoading }) => ({ data, isLoading }));
}

// Batch variant of useEvent, for screens (like the profile/home page) that
// need title/cover for every event a user belongs to at once. Shares the
// same eventKeys.detail cache entries as useEvent, so a membership whose
// feed the user already visited is served from cache. Order-preserving:
// result[i] corresponds to eventIds[i].
export function useEventDetails(eventIds: string[]): EventDetailState[] {
    const { isAuthenticated } = useAuth();
    const staleTime = usePresignedUrlRefreshMs();

    return useQueries({
        queries: eventIds.map((id) => ({
            queryKey: eventKeys.detail(id),
            queryFn: () => api.get<EventDetailResponseDto>(endpoints.events.byId(id)),
            enabled: isAuthenticated,
            staleTime,
        })),
        combine: combineEventDetails,
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

// PATCH /api/events/{id} — HOST of the event only. Partial update, no
// eventType (not editable server-side, see integration guide §8).
export function useUpdateEvent(eventId: string | null) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (input: EventPatchDto) => api.patch<EventResponseDto>(endpoints.events.byId(eventId!), input),
        onSuccess: (event) => {
            // Only what the editable fields feed. The event itself is exact, so
            // its posts, media and members don't refetch. Dates and the draft's
            // duration move the billing, quote and coverage options; the RSVP
            // reports print the title and date.
            queryClient.invalidateQueries({ queryKey: eventKeys.detail(event.id), exact: true });
            queryClient.invalidateQueries({ queryKey: myEventsKeys.all });
            queryClient.invalidateQueries({ queryKey: billingKeys.event(event.id) });
            queryClient.invalidateQueries({ queryKey: quoteKeys.all(event.id) });
            queryClient.invalidateQueries({ queryKey: usageKeys.event(event.id) });
            queryClient.invalidateQueries({ queryKey: upgradeOptionsKeys.event(event.id) });
            queryClient.invalidateQueries({ queryKey: extensionOptionsKeys.event(event.id) });
            // rsvpKeys.report's prefix, spelled out because useRsvps imports this file.
            queryClient.invalidateQueries({ queryKey: ['events', event.id, 'rsvps', 'report'] });
        },
    });
}
