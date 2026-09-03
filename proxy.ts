import { NextRequest, NextResponse } from 'next/server';

import { ACCESS_TOKEN_HEADER, ACCESS_TOKEN_MAX_AGE_SECONDS, AUTH_COOKIES, baseCookieOptions } from '@/lib/auth/authCookies';
import { springAuth } from '@/lib/auth/springAuth';
import { routes } from '@/lib/routes';

// Explicit allowlist, not a denylist: every prefix listed here requires a
// valid session, and everything else passes through untouched. A new
// protected route has to be added here deliberately rather than relying on
// an exclusion pattern that could silently leave a public route ungated —
// or, worse, gate one that was meant to stay public.
const PROTECTED_PREFIXES = ['/admin', '/feed', '/notifications', '/profile', '/event-not-found', '/post/'];

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

async function refreshSession(request: NextRequest): Promise<{ accessToken: string; cookies: CookieWrite[] } | null> {
    const refreshToken = request.cookies.get(AUTH_COOKIES.refreshToken)?.value;
    if (!refreshToken) return null;

    try {
        const auth = await springAuth.refresh(refreshToken);
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
        return { accessToken: auth.accessToken, cookies };
    } catch {
        return null;
    }
}

export async function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl;
    if (!isProtectedPath(pathname)) return NextResponse.next();

    const existingToken = request.cookies.get(AUTH_COOKIES.accessToken)?.value ?? null;
    const refreshed = existingToken ? null : await refreshSession(request);
    const accessToken = existingToken ?? refreshed?.accessToken ?? null;

    if (!accessToken) {
        const redirect = NextResponse.redirect(new URL(routes.login, request.url));
        redirect.cookies.delete(AUTH_COOKIES.accessToken);
        redirect.cookies.delete(AUTH_COOKIES.refreshToken);
        return redirect;
    }

    const requestHeaders = new Headers(request.headers);
    requestHeaders.set(ACCESS_TOKEN_HEADER, accessToken);
    const response = NextResponse.next({ request: { headers: requestHeaders } });

    for (const cookie of refreshed?.cookies ?? []) {
        response.cookies.set(cookie.name, cookie.value, cookie.options);
    }

    return response;
}

export const config = {
    matcher: ['/((?!_next/static|_next/image|favicon.ico|api).*)'],
};
