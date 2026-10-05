// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AUTH_COOKIES } from '@/lib/auth/authCookies';

import { POST } from './route';

// What the app's own sign-up form sends.
const SAME_ORIGIN = { 'sec-fetch-site': 'same-origin', 'content-type': 'application/json' };

function registerRequest(headers: Record<string, string> = SAME_ORIGIN) {
    return new Request('http://localhost/api/auth/register', {
        method: 'POST',
        headers,
        body: JSON.stringify({ email: 'a@b.c', password: 'password1', acceptedGuidelinesVersion: '1' }),
    });
}

const { register, jar } = vi.hoisted(() => ({ register: vi.fn(), jar: new Map<string, string>() }));

vi.mock('@/lib/auth/springAuth', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@/lib/auth/springAuth')>();
    return { ...actual, springAuth: { ...actual.springAuth, register: (...a: unknown[]) => register(...a) } };
});

vi.mock('next/headers', () => {
    const cookieStore = {
        get: () => undefined,
        set: (name: string, value: string) => void jar.set(name, value),
    };
    return { cookies: async () => cookieStore };
});

beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    register.mockReset();
    jar.clear();
});

describe('POST /api/auth/register', () => {
    it('signs the new account in', async () => {
        register.mockResolvedValue({ accessToken: 'at', refreshToken: 'rt', userId: 'u1' });
        const res = await POST(registerRequest());
        expect(res.status).toBe(200);
        expect(jar.get(AUTH_COOKIES.refreshToken)).toBe('rt');
    });

    it('accepts a browser that sends Origin instead of Sec-Fetch-Site', async () => {
        register.mockResolvedValue({ accessToken: 'at', refreshToken: 'rt', userId: 'u1' });
        const res = await POST(registerRequest({ origin: 'http://localhost', host: 'localhost', 'content-type': 'application/json' }));
        expect(res.status).toBe(200);
    });

    it('refuses a cross-site request without creating an account', async () => {
        const res = await POST(registerRequest({ 'sec-fetch-site': 'cross-site', 'content-type': 'application/json' }));
        expect(res.status).toBe(403);
        expect(register).not.toHaveBeenCalled();
        expect(jar.size).toBe(0);
    });

    it('refuses an Origin from another site', async () => {
        const res = await POST(registerRequest({ origin: 'https://evil.test', host: 'localhost', 'content-type': 'application/json' }));
        expect(res.status).toBe(403);
        expect(register).not.toHaveBeenCalled();
    });

    it('refuses a request with neither Sec-Fetch-Site nor Origin', async () => {
        const res = await POST(registerRequest({ 'content-type': 'application/json' }));
        expect(res.status).toBe(403);
        expect(register).not.toHaveBeenCalled();
    });

    it('refuses a text/plain body with 415', async () => {
        const res = await POST(registerRequest({ 'sec-fetch-site': 'same-origin', 'content-type': 'text/plain' }));
        expect(res.status).toBe(415);
        expect(register).not.toHaveBeenCalled();
    });
});
