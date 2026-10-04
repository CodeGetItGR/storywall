// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AUTH_COOKIES, REFRESH_TOKEN_MAX_AGE_SECONDS } from '@/lib/auth/authCookies';

import { POST } from './route';

// What the app's own login form sends.
const SAME_ORIGIN = { 'sec-fetch-site': 'same-origin', 'content-type': 'application/json' };

function loginRequest(headers: Record<string, string> = SAME_ORIGIN, body = JSON.stringify({ email: 'a@b.c', password: 'pw' })) {
    return new Request('http://localhost/api/auth/login', { method: 'POST', headers, body });
}

const { login, maxAges } = vi.hoisted(() => ({ login: vi.fn(), maxAges: new Map<string, number | undefined>() }));

vi.mock('@/lib/auth/springAuth', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@/lib/auth/springAuth')>();
    return { ...actual, springAuth: { ...actual.springAuth, login: (...a: unknown[]) => login(...a) } };
});

vi.mock('@/lib/auth/accountLocale', () => ({ restoreAccountLocale: async () => {} }));

vi.mock('next/headers', () => {
    const cookieStore = {
        get: () => undefined,
        set: (name: string, _value: string, options?: { maxAge?: number }) => void maxAges.set(name, options?.maxAge),
    };
    return { cookies: async () => cookieStore };
});

beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    login.mockReset();
    maxAges.clear();
});

describe('POST /api/auth/login', () => {
    it('keeps the refresh cookie after the browser closes', async () => {
        login.mockResolvedValue({ accessToken: 'at', refreshToken: 'rt', userId: 'u1' });
        const res = await POST(loginRequest());
        expect(res.status).toBe(200);
        expect(maxAges.get(AUTH_COOKIES.refreshToken)).toBe(REFRESH_TOKEN_MAX_AGE_SECONDS);
    });

    // Otherwise Spring counts every browser's login against this server's one address.
    it("passes the browser's address on to Spring", async () => {
        login.mockResolvedValue({ accessToken: 'at', refreshToken: 'rt', userId: 'u1' });
        await POST(loginRequest({ ...SAME_ORIGIN, 'x-forwarded-for': '198.51.100.7' }));
        expect(login).toHaveBeenCalledWith(expect.anything(), expect.anything(), '198.51.100.7');
    });

    // Another site's form, posted in the visitor's browser, would sign them into the attacker's account.
    it('refuses a cross-site request without signing in', async () => {
        const res = await POST(loginRequest({ 'sec-fetch-site': 'cross-site', 'content-type': 'application/json' }));
        expect(res.status).toBe(403);
        expect(login).not.toHaveBeenCalled();
        expect(maxAges.size).toBe(0);
    });

    it('refuses a request with neither Sec-Fetch-Site nor Origin', async () => {
        const res = await POST(loginRequest({ 'content-type': 'application/json' }));
        expect(res.status).toBe(403);
        expect(login).not.toHaveBeenCalled();
    });

    // An enctype="text/plain" form can still carry a JSON-looking body.
    it('refuses a text/plain body with 415', async () => {
        const res = await POST(loginRequest({ 'sec-fetch-site': 'same-origin', 'content-type': 'text/plain' }));
        expect(res.status).toBe(415);
        expect(login).not.toHaveBeenCalled();
    });
});
