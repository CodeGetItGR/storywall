// @vitest-environment node
import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AUTH_COOKIES } from '@/lib/auth/authCookies';
import { SpringAuthError } from '@/lib/auth/springAuth';

import { proxy } from './proxy';

const refresh = vi.hoisted(() => vi.fn());
vi.mock('@/lib/auth/springAuth', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@/lib/auth/springAuth')>();
    return { ...actual, springAuth: { ...actual.springAuth, refresh: (...a: unknown[]) => refresh(...a) } };
});

function request(cookies: Partial<Record<keyof typeof AUTH_COOKIES, string>> = {}) {
    const req = new NextRequest('http://localhost/feed');
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
});
