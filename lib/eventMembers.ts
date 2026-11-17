import type { EventHostResponseDto, EventMemberResponseDto } from '@/lib/api/types';

// The Members list: everyone who isn't already shown under Current hosts.
export function guestMembers(members: EventMemberResponseDto[], hosts: EventHostResponseDto[]): EventMemberResponseDto[] {
    const hostMemberIds = new Set(hosts.map((host) => host.memberId));
    return members.filter((member) => !hostMemberIds.has(member.id));
}

// Primary host (display order 0) first.
export function sortHosts(hosts: EventHostResponseDto[]): EventHostResponseDto[] {
    return [...hosts].sort((first, second) => first.displayOrder - second.displayOrder);
}
