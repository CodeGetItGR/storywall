import { cookies, headers } from 'next/headers';

import { endpoints } from '@/lib/api/endpoints';
import { normalizeList } from '@/lib/api/pagination';
import { serverGet } from '@/lib/api/serverFetch';
import type { EventDetailResponseDto, EventMemberResponseDto } from '@/lib/api/types';
import { ACCESS_TOKEN_HEADER } from '@/lib/auth/authCookies';
import { ACTIVE_EVENT_COOKIE } from '@/lib/storageKeys';

export interface ServerEventContext {
    accessToken: string;
    memberships: EventMemberResponseDto[];
    activeEventId: string | null;
    isHost: boolean;
}

// The access token a page's server prefetch should use, or null when it
// shouldn't prefetch: no session, or not a full page load.
//
// Only a full page load (a typed URL, a reload, an opened link) prefetches.
// An in-app navigation, a link prefetch or router.refresh() is the app router
// fetching the page instead: the client cache usually has the data already,
// and waiting on Spring here would hold the whole navigation. The page then
// renders at once and its hooks fetch whatever is missing.
//
// Next hides its own `rsc` header from server code, so this reads the
// browser's Sec-Fetch-Dest: `document` for a page load, `empty` for the
// router's fetches. A browser that doesn't send it counts as a page load.
export async function prefetchAccessToken(): Promise<string | null> {
    const headerList = await headers();
    const fetchDest = headerList.get('sec-fetch-dest');
    if (fetchDest !== null && fetchDest !== 'document') return null;
    return headerList.get(ACCESS_TOKEN_HEADER);
}

async function resolveEventContext(accessToken: string | null, eventId?: string): Promise<ServerEventContext | null> {
    if (!accessToken) return null;

    try {
        const [membershipsRes, cookieStore] = await Promise.all([serverGet<EventMemberResponseDto[]>(endpoints.me.events, accessToken), cookies()]);
        const memberships = normalizeList(membershipsRes).items;
        const requestedEventId = eventId ?? cookieStore.get(ACTIVE_EVENT_COOKIE)?.value ?? memberships[0]?.eventId;
        const activeMembership = memberships.find((m) => m.eventId === requestedEventId);

        return {
            accessToken,
            memberships,
            activeEventId: activeMembership?.eventId ?? null,
            isHost: activeMembership?.role === 'HOST',
        };
    } catch {
        return null;
    }
}

// Server-side mirror of EventProvider's active-event resolution (memberships
// + the last-selected event cookie, falling back to the first membership) —
// lets a route Server Component prefetch event-scoped data for the same
// event EventRouteGate will land on client-side. Same recipe as
// app/(app)/(event)/layout.tsx; that layout also calls this, so on any page
// under the (event) group the memberships fetch below is deduped by Next's
// per-request fetch memoization rather than hitting Spring twice.
//
// Pass `eventId` from a page's own route param (every event-scoped page has
// one now) to resolve host status for that specific event instead of
// whatever the cookie last pointed at.
//
// For prefetching only: null whenever prefetchAccessToken is.
export async function resolveServerEventContext(eventId?: string): Promise<ServerEventContext | null> {
    return resolveEventContext(await prefetchAccessToken(), eventId);
}

// The same resolution for a bare-path redirect stub, which has no eventId of
// its own and has to resolve on every request, in-app navigations included.
// It renders nothing, so it costs a navigation no prefetch.
export async function resolveServerRedirectContext(): Promise<ServerEventContext | null> {
    return resolveEventContext((await headers()).get(ACCESS_TOKEN_HEADER));
}

// The event's detail, for pages that gate their prefetch on it (plan, status,
// modules). It doesn't depend on the memberships, so fetch it alongside
// resolveServerEventContext rather than after it — one Spring round trip
// instead of two before the page can render. Null when prefetchAccessToken is,
// or when Spring can't answer; the client hooks fetch normally then.
export async function resolveServerEventDetail(eventId: string): Promise<EventDetailResponseDto | null> {
    const accessToken = await prefetchAccessToken();
    if (!accessToken) return null;

    try {
        return await serverGet<EventDetailResponseDto>(endpoints.events.byId(eventId), accessToken);
    } catch {
        return null;
    }
}
