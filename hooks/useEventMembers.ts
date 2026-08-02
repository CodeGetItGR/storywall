import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { myEventsKeys } from '@/hooks/useMyEvents';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import { normalizeList } from '@/lib/api/pagination';
import type { EventMemberPatchDto, EventMemberRequestDto, EventMemberResponseDto } from '@/lib/api/types';

export const eventMemberKeys = {
    list: (eventId: string) => ['events', eventId, 'members'] as const,
    detail: (id: string) => ['event-members', id] as const,
};

// GET /api/events/{eventId}/members — any member of the event.
export function useEventMembers(eventId: string | null) {
    return useQuery({
        queryKey: eventMemberKeys.list(eventId ?? ''),
        queryFn: async () => {
            const res = await api.get<EventMemberResponseDto[]>(endpoints.events.members(eventId!));
            return normalizeList(res).items;
        },
        enabled: Boolean(eventId),
    });
}

export function useEventMember(id: string | null) {
    return useQuery({
        queryKey: eventMemberKeys.detail(id ?? ''),
        queryFn: () => api.get<EventMemberResponseDto>(endpoints.eventMembers.byId(id!)),
        enabled: Boolean(id),
    });
}

// POST /api/event-members — HOST of dto.eventId only.
export function useCreateEventMember() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (input: EventMemberRequestDto) => api.post<EventMemberResponseDto>(endpoints.eventMembers.create, input),
        onSuccess: (member) => {
            queryClient.invalidateQueries({ queryKey: eventMemberKeys.list(member.eventId) });
        },
    });
}

// PATCH /api/event-members/{id} — HOST, or the member editing their own
// profile. Callers must omit `isFeatured` themselves when the current user
// isn't a host — the server 403s a self-edit that includes it (see guide §5).
export function useUpdateEventMember(id: string, eventId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (input: EventMemberPatchDto) => api.patch<EventMemberResponseDto>(endpoints.eventMembers.byId(id), input),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: eventMemberKeys.detail(id) });
            queryClient.invalidateQueries({ queryKey: eventMemberKeys.list(eventId) });
        },
    });
}

export function useDeleteEventMember(eventId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: string) => api.del<void>(endpoints.eventMembers.byId(id)),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: eventMemberKeys.list(eventId) });
        },
    });
}

// POST /api/event-members/{id}/claim — hasRole('USER'). Links the caller's
// own account to an account-less membership (e.g. a host-added honoree)
// whose invitation email matches the caller's account email.
export function useClaimEventMember() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: string) => api.post<EventMemberResponseDto>(endpoints.eventMembers.claim(id)),
        onSuccess: (member) => {
            queryClient.invalidateQueries({ queryKey: eventMemberKeys.detail(member.id) });
            queryClient.invalidateQueries({ queryKey: eventMemberKeys.list(member.eventId) });
            queryClient.invalidateQueries({ queryKey: myEventsKeys.all });
        },
    });
}
