import { NextRequest, NextResponse } from 'next/server';

import { defaultLocale, type Locale, localeCookieMaxAge, localeCookieName } from '@/i18n/config';
import { getLegalPagePath, getPublicLandingPath, legalPageForPath, type LegalPagePath, publicPageLocale } from '@/i18n/publicLocale';
import { PUBLIC_LOCALE_HEADER } from '@/i18n/publicMessages';
import { resolveLocale } from '@/i18n/resolveLocale';
import {
    ACCESS_TOKEN_HEADER,
    ACCESS_TOKEN_MAX_AGE_SECONDS,
    AUTH_COOKIES,
    baseCookieOptions,
    REFRESH_TOKEN_MAX_AGE_SECONDS,
    SESSION_REFRESHED_HEADER,
} from '@/lib/auth/authCookies';
import { AUTH_RETURN_PATH_PARAM } from '@/lib/auth/returnPath';
import { clientIpFrom, springAuth, SpringAuthError } from '@/lib/auth/springAuth';
import { inviteHostRoute, isInviteHost, mainSiteUrl } from '@/lib/invitation/inviteHost';
import { type Occasion, occasionPageForPath, occasionPath } from '@/lib/occasions/occasions';
import { qrWeddingMovedPath, qrWeddingRedirectPath } from '@/lib/qrWeddingPage';
import { routes } from '@/lib/routes';
import { showsSaveMyDate } from '@/lib/saveMyDateRelease';
import { SITE_URL } from '@/lib/seo';
import { isSharedLinkPath, readShareLocale, SHARE_LOCALE_PARAM } from '@/lib/shareLinks';
import { takeVisitSourceParam, VISIT_SOURCE_PARAM } from '@/lib/signupSource';

// Explicit allowlist, not a denylist: every prefix listed here requires a
// valid session, and everything else passes through untouched. A new
// protected route has to be added here deliberately rather than relying on
// an exclusion pattern that could silently leave a public route ungated —
// or, worse, gate one that was meant to stay public.
const PROTECTED_PREFIXES = ['/admin', '/feed', '/home', '/notifications', '/profile', '/business', '/partner', '/event-not-found', '/post/'];

// The Save my date editor opens signed out too: a visitor edits first and signs in to publish. A
// session, when there is one, is still handed to the page for its prefetch. On the production site
// before launch it 404s like the rest of Save my date.
const SAVE_MY_DATE_EDITOR_PREFIX = '/save-my-date/editor';

function isProtectedPath(pathname: string): boolean {
    if (PROTECTED_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(prefix))) return true;
    // Every /events/... route (new, checkout, settings) needs a session. The
    // client gate on /events/new only adds role and email-verification checks.
    return pathname.startsWith('/events/');
}

// Pages that read the session when there is one and open without it.
function isOptionalSessionPath(pathname: string): boolean {
    return pathname.startsWith(SAVE_MY_DATE_EDITOR_PREFIX) && showsSaveMyDate();
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
        const auth = await springAuth.refresh(refreshToken, locale, clientIpFrom(request.headers));
        const cookies: CookieWrite[] = [
            {
                name: AUTH_COOKIES.accessToken,
                value: auth.accessToken,
                options: { ...baseCookieOptions(), maxAge: ACCESS_TOKEN_MAX_AGE_SECONDS },
            },
        ];
        if (auth.refreshToken) {
            cookies.push({
                name: AUTH_COOKIES.refreshToken,
                value: auth.refreshToken,
                options: { ...baseCookieOptions(), maxAge: REFRESH_TOKEN_MAX_AGE_SECONDS },
            });
        }
        return { kind: 'ok', accessToken: auth.accessToken, cookies };
    } catch (error) {
        if (error instanceof SpringAuthError && error.status === 401) return { kind: 'signed-out' };
        return { kind: 'unavailable' };
    }
}

// `/` is the default-locale landing page. A visitor whose saved choice or
// browser language is another locale goes to that locale's page instead.
// Picking the default locale in the switcher saves the cookie that keeps
// them on `/`.
function preferredLandingRedirect(request: NextRequest): NextResponse | null {
    const locale = resolveLocale(request.cookies.get(localeCookieName)?.value, request.headers.get('accept-language'));
    if (locale === defaultLocale) return null;

    const url = request.nextUrl.clone();
    url.pathname = getPublicLandingPath(locale);
    return NextResponse.redirect(url);
}

// Contact and legal pages have one URL per language (`/legal/terms`, `/el/legal/terms`) but live
// once, at the English path: the Greek URL renders that page in Greek. Like `/`, the English URL
// sends a visitor whose saved choice or browser language is another locale to that locale's URL.
function legalPageResponse(request: NextRequest, { path, locale }: { path: LegalPagePath; locale: Locale }): NextResponse {
    if (locale === defaultLocale) {
        const preferred = resolveLocale(request.cookies.get(localeCookieName)?.value, request.headers.get('accept-language'));
        if (preferred !== defaultLocale) {
            const url = request.nextUrl.clone();
            url.pathname = getLegalPagePath(path, preferred);
            return NextResponse.redirect(url);
        }
    }

    const requestHeaders = new Headers(request.headers);
    requestHeaders.set(PUBLIC_LOCALE_HEADER, locale);
    if (locale === defaultLocale) return NextResponse.next({ request: { headers: requestHeaders } });

    const url = request.nextUrl.clone();
    url.pathname = path;
    return NextResponse.rewrite(url, { request: { headers: requestHeaders } });
}

// Occasion pages have one URL per language (`/weddings`, `/el/gamos`). Like `/`, the English URL
// sends a visitor whose saved choice or browser language is another locale to that locale's URL.
function preferredOccasionRedirect(request: NextRequest, { occasion, locale }: { occasion: Occasion; locale: Locale }): NextResponse | null {
    if (locale !== defaultLocale) return null;
    const preferred = resolveLocale(request.cookies.get(localeCookieName)?.value, request.headers.get('accept-language'));
    if (preferred === defaultLocale) return null;

    const url = request.nextUrl.clone();
    url.pathname = occasionPath(occasion, preferred);
    return NextResponse.redirect(url);
}

// A shared link opens in the sharer's language, and the rest of the visit
// stays in it. A visitor who already picked a language keeps theirs.
function sharedLinkLocale(request: NextRequest): Locale | null {
    if (!isSharedLinkPath(request.nextUrl.pathname)) return null;
    if (request.cookies.get(localeCookieName)?.value) return null;
    return readShareLocale(request.nextUrl.searchParams.get(SHARE_LOCALE_PARAM));
}

// invite.storywall.gr serves published invitations and the files they load, nothing else. Session
// cookies are host-only, so none reach it, and nothing here reads one.
function inviteHostResponse(request: NextRequest, host: string): NextResponse {
    const route = inviteHostRoute(request.nextUrl.pathname);
    if (route.kind === 'file') return NextResponse.next();
    if (route.kind === 'main-site') {
        const visited = new URL(`${request.nextUrl.pathname}${request.nextUrl.search}`, `${request.nextUrl.protocol}//${host}`);
        return NextResponse.redirect(mainSiteUrl(visited, SITE_URL));
    }

    const url = request.nextUrl.clone();
    url.pathname = route.path;
    const response = NextResponse.rewrite(url);
    response.headers.set('X-Robots-Tag', 'noindex, nofollow');
    return response;
}

export async function proxy(request: NextRequest) {
    // The Host header names the domain the visitor typed; behind `next start` nextUrl only has the bind address.
    const host = request.headers.get('host') ?? request.nextUrl.host;
    if (isInviteHost(host)) return inviteHostResponse(request, host);

    const { pathname } = request.nextUrl;
    if (pathname === '/') {
        const redirect = preferredLandingRedirect(request);
        if (redirect) return redirect;
    }

    const legalPage = legalPageForPath(pathname);
    if (legalPage) return legalPageResponse(request, legalPage);

    // Keeps the query string, so a campaign link to the page still counts its visit.
    const qrWeddingRedirect = qrWeddingRedirectPath(pathname);
    if (qrWeddingRedirect) {
        const url = request.nextUrl.clone();
        url.pathname = qrWeddingRedirect;
        return NextResponse.redirect(url);
    }
    const qrWeddingMoved = qrWeddingMovedPath(pathname);
    if (qrWeddingMoved) {
        const url = request.nextUrl.clone();
        url.pathname = qrWeddingMoved;
        return NextResponse.redirect(url, 308);
    }

    const occasionPage = occasionPageForPath(pathname);
    if (occasionPage) {
        const redirect = preferredOccasionRedirect(request, occasionPage);
        if (redirect) return redirect;
    }

    const publicLocale = publicPageLocale(pathname) ?? occasionPage?.locale;
    if (publicLocale) {
        const requestHeaders = new Headers(request.headers);
        requestHeaders.set(PUBLIC_LOCALE_HEADER, publicLocale);
        return NextResponse.next({ request: { headers: requestHeaders } });
    }
    const shareLocale = sharedLinkLocale(request);
    if (shareLocale) {
        const requestHeaders = new Headers(request.headers);
        requestHeaders.set(PUBLIC_LOCALE_HEADER, shareLocale);
        const response = NextResponse.next({ request: { headers: requestHeaders } });
        response.cookies.set(localeCookieName, shareLocale, { path: '/', maxAge: localeCookieMaxAge });
        return response;
    }
    const optionalSession = isOptionalSessionPath(pathname);
    if (!optionalSession && !isProtectedPath(pathname)) return NextResponse.next();

    const session = await resolveSession(request);

    if (session.kind === 'signed-out' && optionalSession) return NextResponse.next();
    if (session.kind === 'signed-out') {
        const loginUrl = new URL(routes.login, request.url);
        // A source carried from a landing page goes on the login page, so it is known before the
        // account is created, not only once the visitor comes back to the return path.
        const { search, source } = takeVisitSourceParam(request.nextUrl.search);
        loginUrl.searchParams.set(AUTH_RETURN_PATH_PARAM, `${pathname}${search}`);
        if (source) loginUrl.searchParams.set(VISIT_SOURCE_PARAM, source);
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
    // Only this proxy says it refreshed, never the browser.
    requestHeaders.delete(SESSION_REFRESHED_HEADER);
    if (session.cookies.length > 0) requestHeaders.set(SESSION_REFRESHED_HEADER, '1');
    const response = NextResponse.next({ request: { headers: requestHeaders } });

    for (const cookie of session.cookies) {
        response.cookies.set(cookie.name, cookie.value, cookie.options);
    }

    return response;
}

export const config = {
    // /monitoring is Sentry's tunnel (next.config.mjs). `api` and `monitoring` skip whole segments only,
    // so an invitation link such as /apiraki-and-eleni still reaches the proxy.
    matcher: ['/((?!_next/static|_next/image|favicon.ico|api(?:/|$)|monitoring(?:/|$)).*)'],
};
