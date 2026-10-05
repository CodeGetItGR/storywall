// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AUTH_COOKIES } from '@/lib/auth/authCookies';

import { POST } from './route';

// What the app's own Google/Apple sign-in sends.
const SAME_ORIGIN = { 'sec-fetch-site': 'same-origin', 'content-type': 'application/json' };

function oauthRequest(headers: Record<string, string> = SAME_ORIGIN) {
    return new Request('http://localhost/api/auth/oauth/GOOGLE', { method: 'POST', headers, body: JSON.stringify({ idToken: 'id-token' }) });
}

const google = { params: Promise.resolve({ provider: 'GOOGLE' }) };

const { oauth, jar } = vi.hoisted(() => ({ oauth: vi.fn(), jar: new Map<string, string>() }));

vi.mock('@/lib/auth/springAuth', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@/lib/auth/springAuth')>();
    return { ...actual, springAuth: { ...actual.springAuth, oauth: (...a: unknown[]) => oauth(...a) } };
});

vi.mock('@/lib/auth/accountLocale', () => ({ restoreAccountLocale: async () => {} }));

vi.mock('next/headers', () => {
    const cookieStore = {
        get: () => undefined,
        set: (name: string, value: string) => void jar.set(name, value),
    };
    return { cookies: async () => cookieStore };
});

beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    oauth.mockReset();
    jar.clear();
});

describe('POST /api/auth/oauth/[provider]', () => {
    it('signs in with the provider token', async () => {
        oauth.mockResolvedValue({ accessToken: 'at', refreshToken: 'rt', userId: 'u1' });
        const res = await POST(oauthRequest(), google);
        expect(res.status).toBe(200);
        expect(oauth).toHaveBeenCalledWith('GOOGLE', { idToken: 'id-token' }, expect.anything(), null);
        expect(jar.get(AUTH_COOKIES.refreshToken)).toBe('rt');
    });

    it('refuses a cross-site request without signing in', async () => {
        const res = await POST(oauthRequest({ 'sec-fetch-site': 'cross-site', 'content-type': 'application/json' }), google);
        expect(res.status).toBe(403);
        expect(oauth).not.toHaveBeenCalled();
        expect(jar.size).toBe(0);
    });

    it('refuses a request with neither Sec-Fetch-Site nor Origin', async () => {
        const res = await POST(oauthRequest({ 'content-type': 'application/json' }), google);
        expect(res.status).toBe(403);
        expect(oauth).not.toHaveBeenCalled();
    });

    it('refuses a text/plain body with 415', async () => {
        const res = await POST(oauthRequest({ 'sec-fetch-site': 'same-origin', 'content-type': 'text/plain' }), google);
        expect(res.status).toBe(415);
        expect(oauth).not.toHaveBeenCalled();
    });
});
