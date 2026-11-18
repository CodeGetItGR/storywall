import type { EventCapabilitiesDto, EventDetailResponseDto, EventModuleResponseDto } from '@/lib/api/types';
import { isEventDeleted } from '@/lib/eventLifecycle';
import { routes } from '@/lib/routes';

type CapabilitiesInput = Pick<EventDetailResponseDto, 'id' | 'status' | 'deletedAt' | 'suspended' | 'capabilities' | 'modules'>;

export type LiteModulePage = 'gallery' | 'wishbook';

// What an event can do, as the backend works it out. A suspended event shows only the suspended view, so it
// has none. A demo snapshot taken before the backend sent them is a full event, which always has a date.
export function eventCapabilities(event: CapabilitiesInput | null | undefined): EventCapabilitiesDto | null {
    if (!event || event.suspended) return null;
    return event.capabilities ?? FULL_CAPABILITIES;
}

const FULL_CAPABILITIES: EventCapabilitiesDto = {
    kind: 'FULL',
    home: 'FEED',
    takesGuests: true,
    hasSchedule: true,
    showsDetailsSettings: true,
    showsShareLinks: true,
    showsGuestCode: false,
    guestCodeActions: [],
};

// A live lite event: draft and deleted ones keep their own guards and open on manage.
export function isLiveLiteEvent(event: CapabilitiesInput | null | undefined): boolean {
    if (!event || event.status === 'DRAFT' || isEventDeleted(event)) return false;
    return eventCapabilities(event)?.kind === 'LITE';
}

// The module pages a lite event has: the gallery and/or the wishbook it paid for. The Bundle has both.
export function liteModulePages(modules: EventModuleResponseDto[]): LiteModulePage[] {
    const pages: LiteModulePage[] = [];
    for (const page of ['gallery', 'wishbook'] as const) {
        if (modules.some((module_) => module_.moduleKey === page && module_.isEnabled)) pages.push(page);
    }
    return pages;
}

// Where "home" goes for an event: draft and deleted events have no feed and land on manage, every other
// event on the page its capabilities name.
export function eventHomeHref(event: CapabilitiesInput): string {
    if (event.status === 'DRAFT' || isEventDeleted(event)) return routes.events.manage(event.id);
    switch (eventCapabilities(event)?.home) {
        case 'GALLERY':
            return routes.events.tools.gallery(event.id);
        case 'WISHBOOK':
            return routes.events.tools.wishbook(event.id);
        case 'MANAGE':
            return routes.events.manage(event.id);
        default:
            return routes.events.feed(event.id);
    }
}

// Routes a live lite event's host can use: its module pages, manage (but not the guest invitation pages), a
// QR card, the plan pages and checkout. Everything else goes home. Sibling of isDeletedEventRouteAllowed.
export function isLiteEventRouteAllowed(pathname: string, event: CapabilitiesInput): boolean {
    const id = event.id;
    const exact = [routes.events.manage(id)];
    for (const page of liteModulePages(event.modules)) exact.push(routes.events.tools[page](id));
    if (exact.includes(pathname)) return true;

    const qrCard = /^\/manage\/qr\/[^/]+\/card$/;
    const base = routes.events.manage(id).replace(/\/manage$/, '');
    const rest = pathname.startsWith(base) ? pathname.slice(base.length) : null;
    if (rest === null) return false;
    return qrCard.test(rest) || rest.startsWith('/settings/') || rest.startsWith('/checkout/');
}
