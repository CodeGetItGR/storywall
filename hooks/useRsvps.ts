import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import { normalizeList } from '@/lib/api/pagination';
import type { RsvpPatchDto, RsvpRequestDto, RsvpResponseDto, RsvpSessionResponsRequestDto, RsvpSessionResponsResponseDto } from '@/lib/api/types';

export const rsvpKeys = {
    list: (eventId: string) => ['events', eventId, 'rsvps'] as const,
    detail: (id: string) => ['rsvps', id] as const,
    sessionResponses: (rsvpId: string) => ['rsvps', rsvpId, 'session-responses'] as const,
};

// GET /api/events/{eventId}/rsvps — HOST only, lists everyone's phone notes.
export function useEventRsvps(eventId: string | null) {
    return useQuery({
        queryKey: rsvpKeys.list(eventId ?? ''),
        queryFn: async () => {
            const res = await api.get<RsvpResponseDto[]>(endpoints.events.rsvps(eventId!));
            return normalizeList(res).items;
        },
        enabled: Boolean(eventId),
    });
}

// GET /api/rsvps/{id} — the RSVP's own member, or a HOST.
export function useRsvp(id: string | null) {
    return useQuery({
        queryKey: rsvpKeys.detail(id ?? ''),
        queryFn: () => api.get<RsvpResponseDto>(endpoints.rsvps.byId(id!)),
        enabled: Boolean(id),
    });
}

// POST /api/rsvps — the member submitting their own RSVP, or a HOST on
// their behalf. Note: neither this nor the PATCH DTO validate
// adultCount/childCount bounds server-side — sanity-check client-side.
// The RSVP response doesn't carry eventId, so pass it in for list invalidation.
export function useCreateRsvp(eventId?: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (input: RsvpRequestDto) => api.post<RsvpResponseDto>(endpoints.rsvps.create, input),
        onSuccess: (rsvp) => {
            queryClient.invalidateQueries({ queryKey: rsvpKeys.detail(rsvp.id) });
            if (eventId) queryClient.invalidateQueries({ queryKey: rsvpKeys.list(eventId) });
        },
    });
}

// PATCH /api/rsvps/{id} — "change my RSVP" (attendance, headcount, etc.),
// now a true partial update instead of delete + recreate.
export function useUpdateRsvp(id: string, eventId?: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (input: RsvpPatchDto) => api.patch<RsvpResponseDto>(endpoints.rsvps.byId(id), input),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: rsvpKeys.detail(id) });
            if (eventId) queryClient.invalidateQueries({ queryKey: rsvpKeys.list(eventId) });
        },
    });
}

export function useDeleteRsvp(eventId?: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: string) => api.del<void>(endpoints.rsvps.byId(id)),
        onSuccess: (_data, id) => {
            queryClient.invalidateQueries({ queryKey: rsvpKeys.detail(id) });
            if (eventId) queryClient.invalidateQueries({ queryKey: rsvpKeys.list(eventId) });
        },
    });
}

// GET /api/rsvps/{rsvpId}/session-responses — per-session attendance for
// multi-session events. Auth inherits from the parent Rsvp.
export function useRsvpSessionResponses(rsvpId: string | null) {
    return useQuery({
        queryKey: rsvpKeys.sessionResponses(rsvpId ?? ''),
        queryFn: async () => {
            const res = await api.get<RsvpSessionResponsResponseDto[]>(endpoints.rsvps.sessionResponses(rsvpId!));
            return normalizeList(res).items;
        },
        enabled: Boolean(rsvpId),
    });
}

export function useCreateRsvpSessionResponse() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (input: RsvpSessionResponsRequestDto) => api.post<RsvpSessionResponsResponseDto>(endpoints.rsvpSessionResponses.create, input),
        onSuccess: (response) => {
            queryClient.invalidateQueries({ queryKey: rsvpKeys.sessionResponses(response.rsvpId) });
        },
    });
}

export function useDeleteRsvpSessionResponse(rsvpId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: string) => api.del<void>(endpoints.rsvpSessionResponses.byId(id)),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: rsvpKeys.sessionResponses(rsvpId) });
        },
    });
}
