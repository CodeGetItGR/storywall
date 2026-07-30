import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";
import { normalizeList } from "@/lib/api/pagination";
import { eventMemberKeys } from "@/hooks/useEventMembers";
import type {
  EventInvitationPatchDto,
  EventInvitationRequestDto,
  EventInvitationResponseDto,
  EventMemberResponseDto,
} from "@/lib/api/types";

export const eventInvitationKeys = {
  list: (eventId: string) => ["events", eventId, "invitations"] as const,
  detail: (id: string) => ["event-invitations", id] as const,
};

// GET /api/events/{eventId}/invitations — HOST of the event only. Carries
// PII (name/email) and the raw inviteToken.
export function useEventInvitations(eventId: string | null) {
  return useQuery({
    queryKey: eventInvitationKeys.list(eventId ?? ""),
    queryFn: async () => {
      const res = await api.get<EventInvitationResponseDto[]>(endpoints.events.invitations(eventId!));
      return normalizeList(res).items;
    },
    enabled: Boolean(eventId),
  });
}

export function useEventInvitation(id: string | null) {
  return useQuery({
    queryKey: eventInvitationKeys.detail(id ?? ""),
    queryFn: () => api.get<EventInvitationResponseDto>(endpoints.eventInvitations.byId(id!)),
    enabled: Boolean(id),
  });
}

// POST /api/event-invitations — HOST of dto.eventId. Returns the invite
// containing the inviteToken used to build the shareable /invite/{token} link.
export function useCreateEventInvitation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: EventInvitationRequestDto) =>
      api.post<EventInvitationResponseDto>(endpoints.eventInvitations.create, input),
    onSuccess: (invitation) => {
      queryClient.invalidateQueries({ queryKey: eventInvitationKeys.list(invitation.eventId) });
    },
  });
}

export function useUpdateEventInvitation(id: string, eventId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: EventInvitationPatchDto) =>
      api.patch<EventInvitationResponseDto>(endpoints.eventInvitations.byId(id), input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: eventInvitationKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: eventInvitationKeys.list(eventId) });
    },
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
// The path for a logged-in invitee; guests use useAuth().guestLogin instead.
export function useAcceptEventInvitation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (inviteToken: string) =>
      api.post<EventMemberResponseDto>(endpoints.eventInvitations.accept(inviteToken)),
    onSuccess: (member) => {
      queryClient.invalidateQueries({ queryKey: eventMemberKeys.list(member.eventId) });
    },
  });
}
