import type { EventModuleResponseDto, EventStatus, QrGuestAction } from '@/lib/api/types';
import { isEventDeleted } from '@/lib/eventLifecycle';
import { isGalleryQrFeatureEnabled } from '@/lib/qrLinks';
import { routes } from '@/lib/routes';

type LiteEventInput = { id: string; status: EventStatus; deletedAt: string | null; suspended?: boolean; modules: EventModuleResponseDto[] };

export type LiteHomeModule = 'gallery' | 'wishbook';

function isPaidFor(modules: EventModuleResponseDto[], moduleKey: string): boolean {
    return modules.some((module_) => module_.moduleKey === moduleKey && module_.isEnabled);
}

// A lite event's plan leaves out the feed, so it takes no guests: they add photos and wishes through its one
// guest code. isEnabled is what the event paid for (plan, unlock or admin grant), the same rule the backend
// uses for "takes guests". A suspended event's modules can't be read, so it never counts.
export function isLiteEvent(event: LiteEventInput | null | undefined): boolean {
    if (!event || event.suspended) return false;
    return !isPaidFor(event.modules, 'posts');
}

// The page a lite event opens on: the gallery when the plan has it (Gallery, Bundle), else the wishbook.
export function liteHomeModule(event: LiteEventInput | null | undefined): LiteHomeModule | null {
    if (!event || !isLiteEvent(event)) return null;
    if (isPaidFor(event.modules, 'gallery')) return 'gallery';
    if (isPaidFor(event.modules, 'wishbook')) return 'wishbook';
    return null;
}

// Where "home" goes for an event: draft and deleted events have no feed and land on manage, a lite event on
// its home module, every other event on the feed.
export function eventHomeHref(event: LiteEventInput): string {
    if (event.status === 'DRAFT' || isEventDeleted(event)) return routes.events.manage(event.id);
    const home = liteHomeModule(event);
    if (home === 'gallery') return routes.events.tools.gallery(event.id);
    if (home === 'wishbook') return routes.events.tools.wishbook(event.id);
    return isLiteEvent(event) ? routes.events.manage(event.id) : routes.events.feed(event.id);
}

// Routes a live lite event's host can use: its modules, manage (but not the guest invitation pages), a QR
// card, the plan pages and checkout. Everything else goes home. Sibling of isDeletedEventRouteAllowed.
export function isLiteEventRouteAllowed(pathname: string, event: LiteEventInput): boolean {
    const id = event.id;
    const exact = [routes.events.manage(id)];
    if (isPaidFor(event.modules, 'gallery')) exact.push(routes.events.tools.gallery(id));
    if (isPaidFor(event.modules, 'wishbook')) exact.push(routes.events.tools.wishbook(id));
    if (exact.includes(pathname)) return true;

    const qrCard = /^\/manage\/qr\/[^/]+\/card$/;
    const base = routes.events.manage(id).replace(/\/manage$/, '');
    const rest = pathname.startsWith(base) ? pathname.slice(base.length) : null;
    if (rest === null) return false;
    return qrCard.test(rest) || rest.startsWith('/settings/') || rest.startsWith('/checkout/');
}

// What the event's guest code offers right now, as the backend works it out: UPLOAD while gallery QR uploads
// are on, WISH while the wishbook is available. The QR link list doesn't carry guestActions, so the host side
// derives them from the event's modules.
export function guestCodeActions(modules: EventModuleResponseDto[]): QrGuestAction[] {
    const actions: QrGuestAction[] = [];
    if (isGalleryQrFeatureEnabled(modules)) actions.push('UPLOAD');
    if (modules.some((module_) => module_.moduleKey === 'wishbook' && module_.isAvailable)) actions.push('WISH');
    return actions;
}
