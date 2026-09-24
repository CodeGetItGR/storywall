import type { EventHostResponseDto, EventModuleResponseDto, EventStatus, ModuleKey } from '@/lib/api/types';
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

// The backend marks every module unavailable the moment deletedAt is set
// (writes are closed), but reads still work — so a deleted event's gallery
// and wishbook are reachable when the host had the module enabled, not when
// it is "available". See soft-deleted-events-fe-integration.md §2–3.
export function readableModuleKeys(event: { deletedAt: string | null; modules: EventModuleResponseDto[] } | null | undefined): Set<ModuleKey> {
    if (!event) return new Set();
    const deleted = isEventDeleted(event);
    return new Set(event.modules.filter((module) => (deleted ? module.isEnabled : module.isAvailable)).map((module) => module.moduleKey));
}

// Whether a live event's plan includes a module right now. Use this (not
// readableModuleKeys) for surfaces that only make sense while the event can
// still be written to, such as RSVP.
export function isModuleAvailable(modules: EventModuleResponseDto[] | null | undefined, moduleKey: ModuleKey): boolean {
    return modules?.some((module) => module.moduleKey === moduleKey && module.isAvailable) ?? false;
}
