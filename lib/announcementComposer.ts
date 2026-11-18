import type { MouseEvent } from 'react';

import type { EventDetailResponseDto, VendorMeDto } from '@/lib/api/types';
import { isEventWritable, isModuleAvailable } from '@/lib/eventLifecycle';
import { routes } from '@/lib/routes';
import { hasVendorCapability } from '@/lib/vendors';

// ?compose=announcement on the feed opens the composer in Announcement mode
// (old /tools/announcement links, the Overview, a planner's tools). It is a
// one-shot trigger: replaced away on the client, then the composer opens.
export const COMPOSE_PARAM = 'compose';
export const ANNOUNCEMENT_COMPOSE_VALUE = 'announcement' as const;

export function announcementComposerHref(eventId: string): string {
    return routes.events.feed(eventId, { compose: ANNOUNCEMENT_COMPOSE_VALUE });
}

export function isAnnouncementComposeRequest(search: Pick<URLSearchParams, 'get'>): boolean {
    return search.get(COMPOSE_PARAM) === ANNOUNCEMENT_COMPOSE_VALUE;
}

export function withoutComposeParam(pathname: string, search: string): string {
    const params = new URLSearchParams(search);
    params.delete(COMPOSE_PARAM);
    const query = params.toString();
    return query ? `${pathname}?${query}` : pathname;
}

// Hosts and planners (ANNOUNCE) post announcements; the public demo has no announcement handlers.
export function canAnnounce({
    canComposePost,
    isHost,
    vendorRole,
    isDemoVisitor,
}: {
    canComposePost: boolean;
    isHost: boolean;
    vendorRole: VendorMeDto | null | undefined;
    isDemoVisitor: boolean;
}): boolean {
    if (!canComposePost || isDemoVisitor) return false;
    return isHost || hasVendorCapability(vendorRole, 'ANNOUNCE');
}

// The composer's own rule for an event (canComposePost): a live event with the posts module.
export function isAnnouncementOpen(event: Pick<EventDetailResponseDto, 'status' | 'modules'> | null | undefined): boolean {
    return Boolean(event) && isEventWritable(event?.status) && isModuleAvailable(event?.modules, 'posts');
}

// ── In-place requests ──
// On the feed, an Announcement link opens the composer where it is instead of
// navigating to the same page with ?compose= (which costs a server render).
type Listener = () => void;

const listeners = new Set<Listener>();

export function subscribeAnnouncementComposerRequests(listener: Listener): () => void {
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
}

// True when the href is the composer link for the page we're on and a composer took the request.
export function openAnnouncementComposerFromHref(href: string): boolean {
    if (typeof window === 'undefined' || listeners.size === 0) return false;
    const url = new URL(href, window.location.href);
    if (!isAnnouncementComposeRequest(url.searchParams) || url.pathname !== window.location.pathname) return false;
    listeners.forEach((listener) => listener());
    return true;
}

// Link onClick: opens the composer in place when the link allows it.
// Modified clicks (new tab, etc.) keep the browser's default.
export function handleAnnouncementLinkClick(event: MouseEvent<HTMLAnchorElement>) {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    if (openAnnouncementComposerFromHref(event.currentTarget.getAttribute('href') ?? '')) event.preventDefault();
}
