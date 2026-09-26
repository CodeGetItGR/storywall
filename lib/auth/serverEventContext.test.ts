import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
    accessToken: null as string | null,
    serverGet: vi.fn(),
}));

vi.mock('next/headers', async () => {
    const { ACCESS_TOKEN_HEADER: header } = await import('@/lib/auth/authCookies');
    return {
        headers: async () => new Headers(mocks.accessToken ? { [header]: mocks.accessToken } : {}),
        cookies: async () => ({ get: () => undefined }),
    };
});

vi.mock('@/lib/api/serverFetch', () => ({ serverGet: mocks.serverGet }));

import { resolveServerEventDetail } from './serverEventContext';

describe('resolveServerEventDetail', () => {
    beforeEach(() => {
        mocks.accessToken = 'token-1';
        mocks.serverGet.mockReset();
    });

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

    it("returns null when Spring can't answer", async () => {
        mocks.serverGet.mockRejectedValue(new Error('Server prefetch failed'));

        await expect(resolveServerEventDetail('event-1')).resolves.toBeNull();
    });
});
