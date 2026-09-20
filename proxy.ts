import { NextRequest, NextResponse } from 'next/server';

import { defaultLocale, localeCookieName, locales } from '@/i18n/config';
import { resolveLocale } from '@/i18n/resolveLocale';
import { ACCESS_TOKEN_HEADER, ACCESS_TOKEN_MAX_AGE_SECONDS, AUTH_COOKIES, baseCookieOptions } from '@/lib/auth/authCookies';
import { AUTH_RETURN_PATH_PARAM } from '@/lib/auth/returnPath';
import { springAuth, SpringAuthError } from '@/lib/auth/springAuth';
import { routes } from '@/lib/routes';

// Explicit allowlist, not a denylist: every prefix listed here requires a
// valid session, and everything else passes through untouched. A new
// protected route has to be added here deliberately rather than relying on
// an exclusion pattern that could silently leave a public route ungated —
// or, worse, gate one that was meant to stay public.
const PROTECTED_PREFIXES = ['/admin', '/feed', '/home', '/notifications', '/profile', '/event-not-found', '/post/'];

function isProtectedPath(pathname: string): boolean {
    if (PROTECTED_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(prefix))) return true;
    // /events/[eventId]/... (checkout, settings) needs a session; /events/new
    // has its own client-side gate and must not match this prefix.
    return pathname.startsWith('/events/') && !pathname.startsWith('/events/new');
}

interface CookieWrite {
    name: string;
    value: string;
    options: ReturnType<typeof baseCookieOptions> & { maxAge?: number };
}

type SessionResolution =
    | { kind: 'ok'; accessToken: string; cookies: CookieWrite[] }
    | { kind: 'signed-out' }
    // Spring couldn't answer (rate limited, down, unreachable). The refresh
    // token may well still be valid, so this must not be treated as a logout.
    | { kind: 'unavailable' };

async function resolveSession(request: NextRequest): Promise<SessionResolution> {
    // The access-token cookie's maxAge matches the JWT's lifetime, so its
    // presence means Spring would accept it. Reusing it instead of refreshing
    // on every request matters because Next runs this for every prefetch as
    // well as every navigation, and every one of those refreshes reaches
    // Spring from this server's address rather than the user's.
    const accessToken = request.cookies.get(AUTH_COOKIES.accessToken)?.value;
    if (accessToken) return { kind: 'ok', accessToken, cookies: [] };

    const refreshToken = request.cookies.get(AUTH_COOKIES.refreshToken)?.value;
    if (!refreshToken) return { kind: 'signed-out' };

    try {
        const locale = resolveLocale(request.cookies.get(localeCookieName)?.value, request.headers.get('accept-language'));
        const auth = await springAuth.refresh(refreshToken, locale);
        const cookies: CookieWrite[] = [
            {
                name: AUTH_COOKIES.accessToken,
                value: auth.accessToken,
                options: { ...baseCookieOptions(), maxAge: ACCESS_TOKEN_MAX_AGE_SECONDS },
            },
        ];
        if (auth.refreshToken) {
            cookies.push({ name: AUTH_COOKIES.refreshToken, value: auth.refreshToken, options: baseCookieOptions() });
        }
        return { kind: 'ok', accessToken: auth.accessToken, cookies };
    } catch (error) {
        if (error instanceof SpringAuthError && error.status === 401) return { kind: 'signed-out' };
        return { kind: 'unavailable' };
    }
}

export async function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl;
    const publicLocale = pathname === '/' ? defaultLocale : locales.find((locale) => pathname === `/${locale}`);
    if (publicLocale) {
        const requestHeaders = new Headers(request.headers);
        requestHeaders.set('x-storywall-locale', publicLocale);
        return NextResponse.next({ request: { headers: requestHeaders } });
    }
    if (!isProtectedPath(pathname)) return NextResponse.next();

    const session = await resolveSession(request);

    if (session.kind === 'signed-out') {
        const loginUrl = new URL(routes.login, request.url);
        loginUrl.searchParams.set(AUTH_RETURN_PATH_PARAM, `${pathname}${request.nextUrl.search}`);
        const redirect = NextResponse.redirect(loginUrl);
        redirect.cookies.delete(AUTH_COOKIES.accessToken);
        redirect.cookies.delete(AUTH_COOKIES.refreshToken);
        return redirect;
    }

    // Without a token the page renders without its server-side prefetch and
    // the client bootstraps through /api/auth/session instead.
    if (session.kind === 'unavailable') return NextResponse.next();

    const requestHeaders = new Headers(request.headers);
    requestHeaders.set(ACCESS_TOKEN_HEADER, session.accessToken);
    const response = NextResponse.next({ request: { headers: requestHeaders } });

    for (const cookie of session.cookies) {
        response.cookies.set(cookie.name, cookie.value, cookie.options);
    }

    return response;
}

export const config = {
    matcher: ['/((?!_next/static|_next/image|favicon.ico|api).*)'],
};
