import { cookies, headers } from 'next/headers';

import { localeCookieName } from '@/i18n/config';
import { resolveLocale } from '@/i18n/resolveLocale';
import { endpoints } from '@/lib/api/endpoints';
import { normalizeList } from '@/lib/api/pagination';
import { serverGet } from '@/lib/api/serverFetch';
import type { EventDetailResponseDto, EventMemberResponseDto, UserResponseDto } from '@/lib/api/types';
import { ACCESS_TOKEN_HEADER, AUTH_COOKIES, SESSION_REFRESHED_HEADER } from '@/lib/auth/authCookies';
import { accessTokenExpiresInMs, sessionFromProfile, type SessionHandoff } from '@/lib/auth/sessionHandoff';
import { clientIpFrom, springAuth, SpringAuthError } from '@/lib/auth/springAuth';
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

// The access token for a redirect stub, which has to resolve on every request,
// in-app navigations included. It renders nothing, so it costs a navigation no
// prefetch. Never use it to prefetch: that's prefetchAccessToken.
export async function redirectAccessToken(): Promise<string | null> {
    return (await headers()).get(ACCESS_TOKEN_HEADER);
}

// The same resolution for a bare-path redirect stub, which has no eventId of
// its own (see redirectAccessToken).
export async function resolveServerRedirectContext(): Promise<ServerEventContext | null> {
    return resolveEventContext(await redirectAccessToken());
}

// Whether Spring has ended this session. Its access token keeps working until
// it expires even then (signing in on another device ends every other
// session), and only a refresh can tell. The browser used to ask on every page
// load through /api/auth/session; asking here keeps a reload ending a revoked
// session. Only Spring's 401 means it's over: a rate limit or an outage leaves
// the session alone (docs/integration guides/session-refresh-fe-integration.md).
async function isSessionRevoked(): Promise<boolean> {
    const [headerList, cookieStore] = await Promise.all([headers(), cookies()]);
    if (headerList.get(SESSION_REFRESHED_HEADER)) return false;

    const refreshToken = cookieStore.get(AUTH_COOKIES.refreshToken)?.value;
    if (!refreshToken) return true;

    try {
        const locale = resolveLocale(cookieStore.get(localeCookieName)?.value, headerList.get('accept-language'));
        await springAuth.refresh(refreshToken, locale, clientIpFrom(headerList));
        return false;
    } catch (error) {
        return error instanceof SpringAuthError && error.status === 401;
    }
}

// The signed-in session the browser would otherwise ask for after the page
// loads, built from /api/me with the token proxy.ts already resolved. Null when
// prefetchAccessToken is, when the session has ended, or when Spring can't
// answer; the browser then bootstraps through /api/auth/session as before.
//
// It hands over the cookie's token, not the one the check gets back, so the two
// expire together: the browser renews a minute before, through
// /api/auth/session, which rewrites the cookie.
export async function resolveServerSession(): Promise<SessionHandoff | null> {
    const accessToken = await prefetchAccessToken();
    if (!accessToken) return null;

    try {
        // Side by side, so the check adds no wait.
        const [profile, revoked] = await Promise.all([serverGet<UserResponseDto>(endpoints.me.profile, accessToken), isSessionRevoked()]);
        if (revoked) return null;
        return {
            session: sessionFromProfile(accessToken, profile),
            expiresInMs: accessTokenExpiresInMs(accessToken, Date.now()) ?? 0,
            profile,
        };
    } catch {
        return null;
    }
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
