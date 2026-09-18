// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AUTH_COOKIES } from '@/lib/auth/authCookies';
import { SpringAuthError } from '@/lib/auth/springAuth';

import { GET } from './route';

const { refresh, jar } = vi.hoisted(() => ({ refresh: vi.fn(), jar: new Map<string, string>() }));

vi.mock('@/lib/auth/springAuth', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@/lib/auth/springAuth')>();
    return { ...actual, springAuth: { ...actual.springAuth, refresh: (...a: unknown[]) => refresh(...a) } };
});

vi.mock('next/headers', () => {
    const cookieStore = {
        get: (name: string) => (jar.has(name) ? { name, value: jar.get(name)! } : undefined),
        set: (name: string, value: string) => void jar.set(name, value),
        delete: (name: string) => void jar.delete(name),
    };
    return { cookies: async () => cookieStore, headers: async () => new Headers() };
});

beforeEach(() => {
    refresh.mockReset();
    jar.clear();
    jar.set(AUTH_COOKIES.refreshToken, 'rt');
});

describe('GET /api/auth/session', () => {
    it('returns the session and rotates the access cookie on success', async () => {
        refresh.mockResolvedValue({ accessToken: 'at', refreshToken: 'rt', userId: 'u1' });
        const res = await GET();
        expect(res.status).toBe(200);
        expect(jar.get(AUTH_COOKIES.accessToken)).toBe('at');
    });

    it('clears cookies and returns 401 when Spring rejects the refresh token', async () => {
        refresh.mockRejectedValue(new SpringAuthError(401, null));
        const res = await GET();
        expect(res.status).toBe(401);
        expect(jar.has(AUTH_COOKIES.refreshToken)).toBe(false);
    });

    it.each([
        ['429', new SpringAuthError(429, null)],
        ['503', new SpringAuthError(503, null)],
        ['network', new TypeError('fetch failed')],
    ])('keeps cookies and returns 503 on a transient failure (%s)', async (_label, error) => {
        refresh.mockRejectedValue(error);
        const res = await GET();
        expect(res.status).toBe(503);
        expect(jar.get(AUTH_COOKIES.refreshToken)).toBe('rt');
    });
});
