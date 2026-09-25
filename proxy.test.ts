// @vitest-environment node
import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { localeCookieName } from '@/i18n/config';
import { PUBLIC_LOCALE_HEADER } from '@/i18n/publicMessages';
import { AUTH_COOKIES } from '@/lib/auth/authCookies';
import { SpringAuthError } from '@/lib/auth/springAuth';

import { proxy } from './proxy';

const refresh = vi.hoisted(() => vi.fn());
vi.mock('@/lib/auth/springAuth', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@/lib/auth/springAuth')>();
    return { ...actual, springAuth: { ...actual.springAuth, refresh: (...a: unknown[]) => refresh(...a) } };
});

function request(cookies: Partial<Record<keyof typeof AUTH_COOKIES, string>> = {}, url = 'http://localhost/feed') {
    const req = new NextRequest(url);
    if (cookies.accessToken) req.cookies.set(AUTH_COOKIES.accessToken, cookies.accessToken);
    if (cookies.refreshToken) req.cookies.set(AUTH_COOKIES.refreshToken, cookies.refreshToken);
    return req;
}

beforeEach(() => {
    refresh.mockReset();
});

describe('proxy', () => {
    it('does not call Spring when a fresh access-token cookie is present', async () => {
        const res = await proxy(request({ accessToken: 'at-1', refreshToken: 'rt' }));
        expect(refresh).not.toHaveBeenCalled();
        expect(res.status).toBe(200);
        expect(res.headers.get('x-middleware-request-x-storywall-access-token')).toBe('at-1');
    });

    it('refreshes when the access-token cookie has expired', async () => {
        refresh.mockResolvedValue({ accessToken: 'at-2', refreshToken: 'rt' });
        const res = await proxy(request({ refreshToken: 'rt' }));
        expect(refresh).toHaveBeenCalledTimes(1);
        expect(res.headers.get('x-middleware-request-x-storywall-access-token')).toBe('at-2');
        expect(res.cookies.get(AUTH_COOKIES.accessToken)?.value).toBe('at-2');
    });

    it('logs out only when Spring says the refresh token is invalid', async () => {
        refresh.mockRejectedValue(new SpringAuthError(401, null));
        const res = await proxy(request({ refreshToken: 'rt' }));
        expect(res.status).toBe(307);
        expect(res.headers.get('location')).toContain('/login');
        expect(res.cookies.get(AUTH_COOKIES.refreshToken)?.value).toBe('');
    });

    it.each([
        ['429', new SpringAuthError(429, null)],
        ['503', new SpringAuthError(503, null)],
        ['network', new TypeError('fetch failed')],
    ])('keeps the session on a transient refresh failure (%s)', async (_label, error) => {
        refresh.mockRejectedValue(error);
        const res = await proxy(request({ refreshToken: 'rt' }));
        expect(res.status).toBe(200);
        expect(res.headers.get('location')).toBeNull();
        expect(res.cookies.get(AUTH_COOKIES.refreshToken)).toBeUndefined();
        expect(res.headers.get('x-middleware-request-x-storywall-access-token')).toBeNull();
    });

    it('redirects to login with no cookies at all', async () => {
        const res = await proxy(request());
        expect(refresh).not.toHaveBeenCalled();
        expect(res.status).toBe(307);
    });

    it('redirects a signed-out visit to /events/new to login with the destination in next', async () => {
        const res = await proxy(request({}, 'http://localhost/events/new?step=plan'));
        expect(res.status).toBe(307);
        const location = new URL(res.headers.get('location') ?? '');
        expect(location.pathname).toBe('/login');
        expect(location.searchParams.get('next')).toBe('/events/new?step=plan');
    });
});

describe('proxy landing locale', () => {
    function landingRequest({ cookie, acceptLanguage, url = 'http://localhost/' }: { cookie?: string; acceptLanguage?: string; url?: string } = {}) {
        const req = new NextRequest(url, acceptLanguage ? { headers: { 'accept-language': acceptLanguage } } : undefined);
        if (cookie) req.cookies.set(localeCookieName, cookie);
        return req;
    }

    it('sends a Greek browser from / to /el', async () => {
        const res = await proxy(landingRequest({ acceptLanguage: 'el-GR,el;q=0.9,en;q=0.8' }));
        expect(res.status).toBe(307);
        expect(new URL(res.headers.get('location') ?? '').pathname).toBe('/el');
    });

    it('sends a saved Greek choice from / to /el over an English browser', async () => {
        const res = await proxy(landingRequest({ cookie: 'el', acceptLanguage: 'en-US' }));
        expect(res.status).toBe(307);
        expect(new URL(res.headers.get('location') ?? '').pathname).toBe('/el');
    });

    it('keeps a saved English choice on / over a Greek browser', async () => {
        const res = await proxy(landingRequest({ cookie: 'en', acceptLanguage: 'el-GR' }));
        expect(res.status).toBe(200);
        expect(res.headers.get(`x-middleware-request-${PUBLIC_LOCALE_HEADER}`)).toBe('en');
    });

    it('keeps a visitor with no language preference on /', async () => {
        const res = await proxy(landingRequest());
        expect(res.status).toBe(200);
        expect(res.headers.get(`x-middleware-request-${PUBLIC_LOCALE_HEADER}`)).toBe('en');
    });

    it('keeps the query string when redirecting', async () => {
        const res = await proxy(landingRequest({ acceptLanguage: 'el', url: 'http://localhost/?utm_source=mail' }));
        const location = new URL(res.headers.get('location') ?? '');
        expect(location.pathname).toBe('/el');
        expect(location.searchParams.get('utm_source')).toBe('mail');
    });

    it('does not redirect /el for an English browser', async () => {
        const res = await proxy(landingRequest({ acceptLanguage: 'en-US', url: 'http://localhost/el' }));
        expect(res.status).toBe(200);
        expect(res.headers.get(`x-middleware-request-${PUBLIC_LOCALE_HEADER}`)).toBe('el');
    });
});

describe('proxy shared link locale', () => {
    function sharedLinkRequest(url: string, cookie?: string) {
        const req = new NextRequest(url, { headers: { 'accept-language': 'en-US' } });
        if (cookie) req.cookies.set(localeCookieName, cookie);
        return req;
    }

    it("opens a shared link in the link's language and remembers it", async () => {
        const res = await proxy(sharedLinkRequest('http://localhost/q/token?lang=el'));
        expect(res.headers.get(`x-middleware-request-${PUBLIC_LOCALE_HEADER}`)).toBe('el');
        expect(res.cookies.get(localeCookieName)?.value).toBe('el');
    });

    it('does the same for invite links', async () => {
        const res = await proxy(sharedLinkRequest('http://localhost/invite/token?lang=el'));
        expect(res.headers.get(`x-middleware-request-${PUBLIC_LOCALE_HEADER}`)).toBe('el');
    });

    it("keeps a visitor's saved language over the link's", async () => {
        const res = await proxy(sharedLinkRequest('http://localhost/q/token?lang=el', 'en'));
        expect(res.headers.get(`x-middleware-request-${PUBLIC_LOCALE_HEADER}`)).toBeNull();
        expect(res.cookies.get(localeCookieName)).toBeUndefined();
    });

    it('ignores an unknown language', async () => {
        const res = await proxy(sharedLinkRequest('http://localhost/q/token?lang=fr'));
        expect(res.headers.get(`x-middleware-request-${PUBLIC_LOCALE_HEADER}`)).toBeNull();
    });

    it('ignores the parameter outside shared links', async () => {
        const res = await proxy(sharedLinkRequest('http://localhost/login?lang=el'));
        expect(res.headers.get(`x-middleware-request-${PUBLIC_LOCALE_HEADER}`)).toBeNull();
    });
});
