import type { EventHostResponseDto, EventStatus } from '@/lib/api/types';
import { routes } from '@/lib/routes';

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

// deletedAt is the one signal for every soft-delete kind (OTP deletion,
// withdrawal, coverage expiry). status stays ACTIVE, so never gate on it.
// See soft-deleted-events-fe-integration.md §1.
export function isEventDeleted(event: { deletedAt: string | null } | null | undefined): boolean {
    return event?.deletedAt !== null && event?.deletedAt !== undefined;
}

// A host of a deleted event keeps exactly three destinations: the reduced
// manage page, and the download-only gallery and wishbook. Exact match only —
// nested routes like /manage/qr or /tools/gallery/qr are write surfaces.
export function isDeletedEventRouteAllowed(pathname: string, eventId: string): boolean {
    const allowed = [routes.events.manage(eventId), routes.events.tools.gallery(eventId), routes.events.tools.wishbook(eventId)];
    return allowed.includes(pathname);
}
