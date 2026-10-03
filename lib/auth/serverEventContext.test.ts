import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
    accessToken: null as string | null,
    // The browser's Sec-Fetch-Dest; null for a browser that doesn't send it.
    fetchDest: null as string | null,
    serverGet: vi.fn(),
}));

vi.mock('next/headers', async () => {
    const { ACCESS_TOKEN_HEADER: header } = await import('@/lib/auth/authCookies');
    return {
        headers: async () => {
            const headerList = new Headers(mocks.accessToken ? { [header]: mocks.accessToken } : {});
            if (mocks.fetchDest) headerList.set('sec-fetch-dest', mocks.fetchDest);
            return headerList;
        },
        cookies: async () => ({ get: () => undefined }),
    };
});

vi.mock('@/lib/api/serverFetch', () => ({ serverGet: mocks.serverGet }));

import {
    prefetchAccessToken,
    redirectAccessToken,
    resolveServerEventContext,
    resolveServerEventDetail,
    resolveServerRedirectContext,
    resolveServerSession,
} from './serverEventContext';

const memberships = [{ eventId: 'event-1', role: 'HOST' }];

beforeEach(() => {
    mocks.accessToken = 'token-1';
    mocks.fetchDest = 'document';
    mocks.serverGet.mockReset();
});

describe('prefetchAccessToken', () => {
    it('returns the token on a full page load', async () => {
        await expect(prefetchAccessToken()).resolves.toBe('token-1');
    });

    it('returns the token when the browser sends no Sec-Fetch-Dest', async () => {
        mocks.fetchDest = null;

        await expect(prefetchAccessToken()).resolves.toBe('token-1');
    });

    it("returns null for the router's own fetches", async () => {
        mocks.fetchDest = 'empty';

        await expect(prefetchAccessToken()).resolves.toBeNull();
    });
});

describe('resolveServerEventContext', () => {
    it('resolves the event on a full page load', async () => {
        mocks.serverGet.mockResolvedValue(memberships);

        await expect(resolveServerEventContext('event-1')).resolves.toMatchObject({ activeEventId: 'event-1', isHost: true });
    });

    it('skips Spring on an in-app navigation', async () => {
        mocks.fetchDest = 'empty';

        await expect(resolveServerEventContext('event-1')).resolves.toBeNull();
        expect(mocks.serverGet).not.toHaveBeenCalled();
    });
});

describe('resolveServerRedirectContext', () => {
    it('still resolves on an in-app navigation', async () => {
        mocks.fetchDest = 'empty';
        mocks.serverGet.mockResolvedValue(memberships);

        await expect(resolveServerRedirectContext()).resolves.toMatchObject({ activeEventId: 'event-1' });
    });

    it('returns null without a session', async () => {
        mocks.accessToken = null;

        await expect(resolveServerRedirectContext()).resolves.toBeNull();
        expect(mocks.serverGet).not.toHaveBeenCalled();
    });
});

describe('redirectAccessToken', () => {
    it('returns the token on an in-app navigation too', async () => {
        mocks.fetchDest = 'empty';

        await expect(redirectAccessToken()).resolves.toBe('token-1');
    });
});

describe('resolveServerSession', () => {
    const profile = {
        id: 'user-1',
        email: 'host@example.test',
        firstName: 'Host',
        lastName: null,
        profilePictureUrl: null,
        authProvider: 'LOCAL',
        isGuestAccount: false,
        status: 'ACTIVE',
        platformRole: 'USER',
        createdAt: '2026-09-01T00:00:00Z',
    };

    function jwtExpiringAt(expSeconds: number): string {
        const payload = btoa(JSON.stringify({ sub: 'user-1', exp: expSeconds })).replace(/=+$/, '');
        return `header.${payload}.signature`;
    }

    afterEach(() => {
        vi.useRealTimers();
    });

    it('hands over the session built from /api/me on a full page load', async () => {
        mocks.serverGet.mockResolvedValue(profile);

        const handoff = await resolveServerSession();

        expect(mocks.serverGet).toHaveBeenCalledWith('/api/me', 'token-1');
        expect(handoff).toMatchObject({ session: { accessToken: 'token-1', userId: 'user-1', role: 'USER' }, profile });
    });

    it('says how long the token has left', async () => {
        const now = Date.UTC(2026, 9, 4, 12, 0, 0);
        vi.useFakeTimers({ now });
        mocks.accessToken = jwtExpiringAt(now / 1000 + 600);
        mocks.serverGet.mockResolvedValue(profile);

        const handoff = await resolveServerSession();

        expect(handoff?.expiresInMs).toBe(600_000);
    });

    it("asks for a refresh straight away when the token's expiry can't be read", async () => {
        mocks.serverGet.mockResolvedValue(profile);

        const handoff = await resolveServerSession();

        expect(handoff?.expiresInMs).toBe(0);
    });

    it('returns null on an in-app navigation', async () => {
        mocks.fetchDest = 'empty';

        await expect(resolveServerSession()).resolves.toBeNull();
        expect(mocks.serverGet).not.toHaveBeenCalled();
    });

    it('returns null without a session', async () => {
        mocks.accessToken = null;

        await expect(resolveServerSession()).resolves.toBeNull();
        expect(mocks.serverGet).not.toHaveBeenCalled();
    });

    it("returns null when Spring can't answer", async () => {
        mocks.serverGet.mockRejectedValue(new Error('Server prefetch failed'));

        await expect(resolveServerSession()).resolves.toBeNull();
    });
});

describe('resolveServerEventDetail', () => {
    it("returns the event's detail", async () => {
        const event = { id: 'event-1' };
        mocks.serverGet.mockResolvedValue(event);

        await expect(resolveServerEventDetail('event-1')).resolves.toBe(event);
        expect(mocks.serverGet).toHaveBeenCalledWith('/api/events/event-1', 'token-1');
    });

    it('returns null without a session', async () => {
        mocks.accessToken = null;

        await expect(resolveServerEventDetail('event-1')).resolves.toBeNull();
        expect(mocks.serverGet).not.toHaveBeenCalled();
    });

    it('returns null on an in-app navigation', async () => {
        mocks.fetchDest = 'empty';

        await expect(resolveServerEventDetail('event-1')).resolves.toBeNull();
        expect(mocks.serverGet).not.toHaveBeenCalled();
    });

    it("returns null when Spring can't answer", async () => {
        mocks.serverGet.mockRejectedValue(new Error('Server prefetch failed'));

        await expect(resolveServerEventDetail('event-1')).resolves.toBeNull();
    });
});
