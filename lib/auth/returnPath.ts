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

// The current location as a `next` value. `search` is what
// useSearchParams().toString() / URL.search give: '' or '?a=b'.
export function buildReturnPath(pathname: string, search: string): string {
    if (!search) return pathname;
    return search.startsWith('?') ? `${pathname}${search}` : `${pathname}?${search}`;
}

export function getPostAuthRedirectPath(role: PlatformRole, returnPath: string | null): string {
    if (role === 'ADMIN') return routes.admin;
    return getSafeReturnPath(returnPath) ?? routes.feed;
}

// A brand-new account has nothing to show in a feed unless it was invited
// to an event, so it lands on home (which also explains email verification).
// `next` is deliberately not consulted here.
export function getPostRegisterRedirectPath(role: PlatformRole, hasInvite: boolean): string {
    if (role === 'ADMIN') return routes.admin;
    return hasInvite ? routes.feed : routes.home;
}
