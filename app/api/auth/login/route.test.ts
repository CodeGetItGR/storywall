// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AUTH_COOKIES, REFRESH_TOKEN_MAX_AGE_SECONDS } from '@/lib/auth/authCookies';

import { POST } from './route';

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
    login.mockReset();
    maxAges.clear();
});

describe('POST /api/auth/login', () => {
    it('keeps the refresh cookie after the browser closes', async () => {
        login.mockResolvedValue({ accessToken: 'at', refreshToken: 'rt', userId: 'u1' });
        const res = await POST(
            new Request('http://localhost/api/auth/login', { method: 'POST', body: JSON.stringify({ email: 'a@b.c', password: 'pw' }) }),
        );
        expect(res.status).toBe(200);
        expect(maxAges.get(AUTH_COOKIES.refreshToken)).toBe(REFRESH_TOKEN_MAX_AGE_SECONDS);
    });
});
