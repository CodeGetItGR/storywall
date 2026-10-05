// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AUTH_COOKIES } from '@/lib/auth/authCookies';

import { POST } from './route';

function logoutRequest(headers: Record<string, string> = { 'sec-fetch-site': 'same-origin' }) {
    return new Request('http://localhost/api/auth/logout', { method: 'POST', headers });
}

const { logout, jar } = vi.hoisted(() => ({ logout: vi.fn(), jar: new Map<string, string>() }));

vi.mock('@/lib/auth/springAuth', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@/lib/auth/springAuth')>();
    return { ...actual, springAuth: { ...actual.springAuth, logout: (...a: unknown[]) => logout(...a) } };
});

vi.mock('next/headers', () => {
    const cookieStore = {
        get: (name: string) => (jar.has(name) ? { name, value: jar.get(name)! } : undefined),
        delete: (name: string) => void jar.delete(name),
    };
    return { cookies: async () => cookieStore, headers: async () => new Headers() };
});

beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    logout.mockReset();
    logout.mockResolvedValue(undefined);
    jar.clear();
    jar.set(AUTH_COOKIES.accessToken, 'at');
    jar.set(AUTH_COOKIES.refreshToken, 'rt');
});

describe('POST /api/auth/logout', () => {
    it('revokes the refresh token and clears both cookies', async () => {
        const res = await POST(logoutRequest());
        expect(res.status).toBe(204);
        expect(logout).toHaveBeenCalledWith('rt', expect.anything(), null);
        expect(jar.size).toBe(0);
    });

    // A logout carries no body, so it needs no Content-Type.
    it('accepts a same-origin request with no Content-Type', async () => {
        const res = await POST(logoutRequest({ origin: 'http://localhost', host: 'localhost' }));
        expect(res.status).toBe(204);
    });

    // Another site could otherwise sign the visitor out with a form post.
    it('refuses a cross-site request and keeps the session', async () => {
        const res = await POST(logoutRequest({ 'sec-fetch-site': 'cross-site' }));
        expect(res.status).toBe(403);
        expect(logout).not.toHaveBeenCalled();
        expect(jar.get(AUTH_COOKIES.refreshToken)).toBe('rt');
    });

    it('refuses a request with neither Sec-Fetch-Site nor Origin', async () => {
        const res = await POST(logoutRequest({}));
        expect(res.status).toBe(403);
        expect(jar.get(AUTH_COOKIES.accessToken)).toBe('at');
    });
});
