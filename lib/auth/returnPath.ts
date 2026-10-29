import type { PlatformRole } from '@/lib/api/types';
import { routes } from '@/lib/routes';

// `next` is a generic "return here after sign-in" path. Nothing here knows
// about any specific destination: a caller that wants the user back on a
// route after signing in puts that route (with its own query string, which
// is preserved) in `next`, and the login page sends them there. Parameters
// meant for the auth page itself (invite, email, …) are separate typed
// fields on routes.auth.login / routes.auth.register.
export const AUTH_RETURN_PATH_PARAM = 'next';

const APP_ORIGIN = 'https://storywall.local';

// `next` is read from a URL query parameter, so it must never be used as an
// arbitrary URL. Keep only same-origin, path-based destinations.
export function getSafeReturnPath(value: string | null): string | null {
    if (!value || !value.startsWith('/') || value.startsWith('//')) return null;

    try {
        const url = new URL(value, APP_ORIGIN);
        if (url.origin !== APP_ORIGIN) return null;

        return `${url.pathname}${url.search}${url.hash}`;
    } catch {
        return null;
    }
}

// A redirect to the login page can't put a link's `#section` in `next`: the
// server never sees it. The browser keeps it on the login URL instead, so the
// login page adds it back. A `next` with its own hash keeps that one.
export function withLocationHash(returnPath: string | null, hash: string): string | null {
    if (!returnPath || returnPath.includes('#') || hash.length <= 1) return returnPath;
    return `${returnPath}${hash}`;
}

// The current location as a `next` value. `search` is what
// useSearchParams().toString() / URL.search give: '' or '?a=b'.
export function buildReturnPath(pathname: string, search: string): string {
    if (!search) return pathname;
    return search.startsWith('?') ? `${pathname}${search}` : `${pathname}?${search}`;
}

function isAdminPath(path: string): boolean {
    const pathname = new URL(path, APP_ORIGIN).pathname;
    return pathname === routes.admin || pathname.startsWith(`${routes.admin}/`);
}

// An admin whose session ended on an admin page comes back with `next` still
// pointing there; anyone else signing in on that tab goes to the feed.
export function getPostAuthRedirectPath(role: PlatformRole, returnPath: string | null): string {
    const safePath = getSafeReturnPath(returnPath);
    if (role === 'ADMIN') return safePath && isAdminPath(safePath) ? safePath : routes.admin;
    if (!safePath || isAdminPath(safePath)) return routes.feed;
    return safePath;
}

// A brand-new account has nothing to show in a feed unless it was invited
// to an event, so it lands on home (which also explains email verification).
// `next` is only followed with an invite: the invite page sets it to that
// event's feed, since bare /feed opens whichever event is active.
export function getPostRegisterRedirectPath(role: PlatformRole, hasInvite: boolean, returnPath: string | null = null): string {
    if (role === 'ADMIN') return routes.admin;
    if (!hasInvite) return routes.home;
    return getSafeReturnPath(returnPath) ?? routes.feed;
}
