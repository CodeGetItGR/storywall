import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocale } from 'next-intl';

import { useAuth } from '@/hooks/useAuth';
import { eventKeys } from '@/hooks/useEvent';
import { eventMemberKeys } from '@/hooks/useEventMembers';
import { eventSessionKeys } from '@/hooks/useEventSessions';
import { useModuleReadable } from '@/hooks/useModuleReadable';
import { myEventsKeys } from '@/hooks/useMyEvents';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import { isNotFoundError, isRsvpNotAttendingError, isSessionRsvpNotEnabledError } from '@/lib/api/errors';
import { normalizeList } from '@/lib/api/pagination';
import type { EventMemberResponseDto } from '@/lib/api/types';
import type {
    RsvpPatchDto,
    RsvpReportDto,
    RsvpReportType,
    RsvpRequestDto,
    RsvpResponseDto,
    RsvpSessionResponsPatchDto,
    RsvpSessionResponsRequestDto,
    RsvpSessionResponsResponseDto,
} from '@/lib/api/types';

export const rsvpKeys = {
    list: (eventId: string) => ['events', eventId, 'rsvps'] as const,
    // Under list, so every RSVP change that invalidates the list refreshes the reports too.
    // Keyed by language because the labels arrive translated.
    report: (eventId: string, reportType: RsvpReportType, locale: string) => ['events', eventId, 'rsvps', 'report', reportType, locale] as const,
    detail: (id: string) => ['rsvps', id] as const,
    // Must stay nested under detail(id) — every RSVP mutation invalidates by
    // that prefix, and this key relies on falling under it to refresh too.
    sessionResponses: (rsvpId: string) => ['rsvps', rsvpId, 'session-responses'] as const,
};

function updateMemberRsvpIdInCollection(members: EventMemberResponseDto[] | undefined, eventMemberId: string, rsvpId: string | null) {
    if (!members) {
        return members;
    }

    return members.map((member) => (member.id === eventMemberId ? { ...member, rsvpId } : member));
}

export function setMemberRsvpIdInCaches(
    queryClient: ReturnType<typeof useQueryClient>,
    eventMemberId: string,
    rsvpId: string | null,
    eventId?: string,
) {
    queryClient.setQueryData<EventMemberResponseDto[] | undefined>(myEventsKeys.all, (members) =>
        updateMemberRsvpIdInCollection(members, eventMemberId, rsvpId),
    );

    if (eventId) {
        queryClient.setQueryData<EventMemberResponseDto[] | undefined>(eventMemberKeys.list(eventId), (members) =>
            updateMemberRsvpIdInCollection(members, eventMemberId, rsvpId),
        );

        queryClient.setQueryData<EventMemberResponseDto | undefined>(eventMemberKeys.detail(eventMemberId), (member) =>
            member ? { ...member, rsvpId } : member,
        );
    }
}

// GET /api/events/{eventId}/rsvps — HOST only, lists everyone's phone notes.
export function useEventRsvps(eventId: string | null) {
    const { isAuthenticated } = useAuth();
    const rsvpReadable = useModuleReadable(eventId, 'rsvp');

    return useQuery({
        queryKey: rsvpKeys.list(eventId ?? ''),
        queryFn: async () => {
            const res = await api.get<RsvpResponseDto[]>(endpoints.events.rsvps(eventId!));
            return normalizeList(res).items;
        },
        enabled: Boolean(eventId) && isAuthenticated && rsvpReadable,
    });
}

// GET /api/events/{eventId}/rsvps/report — HOST only. One report object for the
// stats tab, the report page and (server-side) the PDF.
export function useRsvpReport(eventId: string | null, reportType: RsvpReportType) {
    const { isAuthenticated } = useAuth();
    const locale = useLocale();
    const rsvpReadable = useModuleReadable(eventId, 'rsvp');

    return useQuery({
        queryKey: rsvpKeys.report(eventId ?? '', reportType, locale),
        queryFn: () => api.get<RsvpReportDto>(endpoints.events.rsvpReport(eventId!, reportType)),
        enabled: Boolean(eventId) && isAuthenticated && rsvpReadable,
    });
}

// GET /api/rsvps/{id} — the RSVP's own member, or a HOST.
export function useRsvp(id: string | null) {
    const { isAuthenticated } = useAuth();

    return useQuery({
        queryKey: rsvpKeys.detail(id ?? ''),
        queryFn: () => api.get<RsvpResponseDto>(endpoints.rsvps.byId(id!)),
        enabled: Boolean(id) && isAuthenticated,
    });
}

// POST /api/rsvps — the member submitting their own RSVP, or a HOST on
// their behalf. The RSVP response doesn't carry eventId, so pass it in for
// list invalidation and current-member cache updates.
export function useCreateRsvp(eventId?: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (input: RsvpRequestDto) => api.post<RsvpResponseDto>(endpoints.rsvps.create, input),
        onSuccess: (rsvp) => {
            queryClient.invalidateQueries({ queryKey: rsvpKeys.detail(rsvp.id) });
            setMemberRsvpIdInCaches(queryClient, rsvp.eventMemberId, rsvp.id, eventId);
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
        onSuccess: (rsvp) => {
            queryClient.invalidateQueries({ queryKey: rsvpKeys.detail(id) });
            setMemberRsvpIdInCaches(queryClient, rsvp.eventMemberId, rsvp.id, eventId);
            if (eventId) queryClient.invalidateQueries({ queryKey: rsvpKeys.list(eventId) });
        },
    });
}

export function useDeleteRsvp(eventId?: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id }: { id: string; eventMemberId: string }) => api.del<void>(endpoints.rsvps.byId(id)),
        onSuccess: (_data, { id, eventMemberId }) => {
            queryClient.invalidateQueries({ queryKey: rsvpKeys.detail(id) });
            setMemberRsvpIdInCaches(queryClient, eventMemberId, null, eventId);
            if (eventId) queryClient.invalidateQueries({ queryKey: rsvpKeys.list(eventId) });
        },
    });
}

// GET /api/rsvps/{rsvpId}/session-responses — per-session attendance for
// multi-session events. Auth inherits from the parent Rsvp.
export function useRsvpSessionResponses(rsvpId: string | null) {
    const { isAuthenticated } = useAuth();

    return useQuery({
        queryKey: rsvpKeys.sessionResponses(rsvpId ?? ''),
        queryFn: async () => {
            const res = await api.get<RsvpSessionResponsResponseDto[]>(endpoints.rsvps.sessionResponses(rsvpId!));
            return normalizeList(res).items;
        },
        enabled: Boolean(rsvpId) && isAuthenticated,
    });
}

// Sessions live both on their own list and on the event detail.
function invalidateEventSessions(queryClient: ReturnType<typeof useQueryClient>, eventId: string) {
    queryClient.invalidateQueries({ queryKey: eventSessionKeys.list(eventId) });
    queryClient.invalidateQueries({ queryKey: eventKeys.detail(eventId), exact: true });
}

// POST /api/rsvp-session-responses — upserts: answering the same session
// again updates the same row. 409 / 5086 means the host closed the session to
// RSVPs, so the cached sessions are stale; 409 / 5087 means the RSVP was
// declined elsewhere, so the cached RSVP is. A 404 means the session itself
// was deleted meanwhile — the cached sessions are just as stale as for 5086.
export function useCreateRsvpSessionResponse(eventId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (input: RsvpSessionResponsRequestDto) => api.post<RsvpSessionResponsResponseDto>(endpoints.rsvpSessionResponses.create, input),
        onSuccess: (response) => {
            queryClient.invalidateQueries({ queryKey: rsvpKeys.sessionResponses(response.rsvpId) });
        },
        onError: (error, input) => {
            if (isSessionRsvpNotEnabledError(error) || isNotFoundError(error)) invalidateEventSessions(queryClient, eventId);
            if (isRsvpNotAttendingError(error)) queryClient.invalidateQueries({ queryKey: rsvpKeys.detail(input.rsvpId) });
        },
    });
}

// PATCH /api/rsvp-session-responses/{id} — the RSVP's own member or a host.
// Same checks as create.
export function useUpdateRsvpSessionResponse(eventId: string, rsvpId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, input }: { id: string; input: RsvpSessionResponsPatchDto }) =>
            api.patch<RsvpSessionResponsResponseDto>(endpoints.rsvpSessionResponses.byId(id), input),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: rsvpKeys.sessionResponses(rsvpId) });
        },
        onError: (error) => {
            if (isSessionRsvpNotEnabledError(error)) invalidateEventSessions(queryClient, eventId);
            if (isRsvpNotAttendingError(error)) queryClient.invalidateQueries({ queryKey: rsvpKeys.detail(rsvpId) });
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
