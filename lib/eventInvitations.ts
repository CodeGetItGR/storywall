import type { EventInvitationResponseDto } from '@/lib/api/types';

export function selectCoHostInvitations(invitations: EventInvitationResponseDto[]): EventInvitationResponseDto[] {
    return invitations.filter((invitation) => invitation.role === 'HOST');
}

export function countPendingCoHostInvitations(invitations: EventInvitationResponseDto[]): number {
    return selectCoHostInvitations(invitations).filter((invitation) => !invitation.usedAt).length;
}
