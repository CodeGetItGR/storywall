import type { EventHostResponseDto, EventStatus } from '@/lib/api/types';

export function isEventWritable(status: EventStatus | null | undefined): boolean {
    return status === 'ACTIVE';
}

// The host with the lowest displayOrder created the event — deletion is
// gated to that one host even though co-hosts can do almost everything
// else. See event-deletion-fe-integration.md §2.
export function getPrimaryHostMemberId(hosts: EventHostResponseDto[]): string | null {
    if (hosts.length === 0) return null;
    return [...hosts].sort((a, b) => a.displayOrder - b.displayOrder)[0].memberId;
}

export function isPrimaryHost(hosts: EventHostResponseDto[], memberId: string | null | undefined): boolean {
    if (!memberId) return false;
    return getPrimaryHostMemberId(hosts) === memberId;
}
