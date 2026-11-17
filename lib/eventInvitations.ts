import type { EventInvitationResponseDto } from '@/lib/api/types';

export function selectCoHostInvitations(invitations: EventInvitationResponseDto[]): EventInvitationResponseDto[] {
    return invitations.filter((invitation) => invitation.role === 'HOST');
}

// Pending only: a claimed invitation's person is already listed as a host.
export function selectPendingCoHostInvitations(invitations: EventInvitationResponseDto[]): EventInvitationResponseDto[] {
    return selectCoHostInvitations(invitations).filter((invitation) => !invitation.usedAt);
}

export type InvitationExpiry = { kind: 'expires'; at: string } | { kind: 'expired' };

export function invitationExpiry(invitation: EventInvitationResponseDto, now: Date = new Date()): InvitationExpiry | null {
    if (!invitation.expiresAt) return null;
    return new Date(invitation.expiresAt).getTime() > now.getTime() ? { kind: 'expires', at: invitation.expiresAt } : { kind: 'expired' };
}
