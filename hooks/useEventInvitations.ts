import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { usePresignedUrlRefreshMs } from '@/hooks/useAppConfig';
import { useAuth } from '@/hooks/useAuth';
import { eventKeys } from '@/hooks/useEvent';
import { eventMemberKeys } from '@/hooks/useEventMembers';
import { myEventsKeys } from '@/hooks/useMyEvents';
import { isEventVendorKey } from '@/hooks/useVendorProfile';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import { normalizeList } from '@/lib/api/pagination';
import type { CoHostInvitationRequestDto, EventInvitationPreviewDto, EventInvitationResponseDto, EventMemberResponseDto } from '@/lib/api/types';

export const eventInvitationKeys = {
    list: (eventId: string) => ['events', eventId, 'invitations'] as const,
    detail: (id: string) => ['event-invitations', id] as const,
    preview: (inviteToken: string) => ['event-invitations', inviteToken, 'preview'] as const,
};

// GET /api/event-invitations/{inviteToken}/preview — public, unauthenticated.
// Powers the branded /invite/[token] onboarding page.
export function useEventInvitationPreview(inviteToken: string | null) {
    return useQuery({
        queryKey: eventInvitationKeys.preview(inviteToken ?? ''),
        queryFn: () => api.get<EventInvitationPreviewDto>(endpoints.eventInvitations.preview(inviteToken!)),
        enabled: Boolean(inviteToken),
        // coverMedia is presigned.
        staleTime: usePresignedUrlRefreshMs(),
    });
}

// GET /api/events/{eventId}/invitations — HOST of the event only. Carries
// PII (name/email) and the raw inviteToken.
export function useEventInvitations(eventId: string | null) {
    const { isAuthenticated } = useAuth();

    return useQuery({
        queryKey: eventInvitationKeys.list(eventId ?? ''),
        queryFn: async () => {
            const res = await api.get<EventInvitationResponseDto[]>(endpoints.events.invitations(eventId!));
            return normalizeList(res).items;
        },
        enabled: Boolean(eventId) && isAuthenticated,
    });
}

export function useEventInvitation(id: string | null) {
    const { isAuthenticated } = useAuth();

    return useQuery({
        queryKey: eventInvitationKeys.detail(id ?? ''),
        queryFn: () => api.get<EventInvitationResponseDto>(endpoints.eventInvitations.byId(id!)),
        enabled: Boolean(id) && isAuthenticated,
    });
}

export function useCreateCoHostInvitation(eventId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (input: CoHostInvitationRequestDto) => api.post<EventInvitationResponseDto>(endpoints.events.hostInvitations(eventId), input),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: eventInvitationKeys.list(eventId) }),
    });
}

export function useDeleteEventInvitation(eventId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: string) => api.del<void>(endpoints.eventInvitations.byId(id)),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: eventInvitationKeys.list(eventId) });
        },
    });
}

// POST /api/event-invitations/{inviteToken}/accept — any registered USER.
// For an already-authenticated visitor; a not-yet-authenticated one attaches
// inviteToken directly to register/login/oauth instead (see useAuth()).
export function useAcceptEventInvitation() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (inviteToken: string) => api.post<EventMemberResponseDto>(endpoints.eventInvitations.accept(inviteToken)),
        // Awaited, so mutateAsync resolves only once the memberships are fresh:
        // EventProvider derives activeMember from them, and the composer and
        // the event navigation stay hidden while it is missing. Also on a
        // 409 already-a-member, where the cache can predate the join too.
        onSettled: (member) =>
            Promise.all([
                queryClient.invalidateQueries({ queryKey: myEventsKeys.all }),
                member && queryClient.invalidateQueries({ queryKey: eventKeys.detail(member.eventId), exact: true }),
                member && queryClient.invalidateQueries({ queryKey: eventMemberKeys.list(member.eventId) }),
                // A guest who joins through a vendor link becomes a vendor in this tab: the vendor menu and sheet need the role at once.
                member &&
                    queryClient.invalidateQueries({ predicate: (query) => isEventVendorKey(query.queryKey) && query.queryKey[1] === member.eventId }),
            ]),
    });
}
