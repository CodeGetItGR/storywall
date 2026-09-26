import type { DehydratedState } from '@tanstack/react-query';
import type { ReactElement } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
    accessToken: null as string | null,
    resolveServerEventDetail: vi.fn(),
    serverGet: vi.fn(),
}));

vi.mock('next/headers', async () => {
    const { ACCESS_TOKEN_HEADER: header } = await import('@/lib/auth/authCookies');
    return { headers: async () => new Headers(mocks.accessToken ? { [header]: mocks.accessToken } : {}) };
});
vi.mock('@/lib/auth/serverEventContext', () => ({ resolveServerEventDetail: mocks.resolveServerEventDetail }));
vi.mock('@/lib/api/serverFetch', () => ({ serverGet: mocks.serverGet }));
vi.mock('./PageClient', () => ({ default: () => null }));

import Page from './page';

const liveEvent = { id: 'e1', status: 'ACTIVE', deletedAt: null, modules: [{ moduleKey: 'playlist', isAvailable: true, isEnabled: true }] };

function visit() {
    return Page({ params: Promise.resolve({ eventId: 'e1' }) });
}

function seededKeys(element: ReactElement) {
    const { state } = element.props as { state: DehydratedState };
    return state.queries.map((query) => query.queryKey);
}

describe('PlaylistPage (server)', () => {
    beforeEach(() => {
        mocks.accessToken = 'token-1';
        mocks.resolveServerEventDetail.mockReset().mockResolvedValue(liveEvent);
        mocks.serverGet.mockReset().mockResolvedValue([]);
    });

    it('asks for the event while the modules are still loading', async () => {
        mocks.serverGet.mockImplementation((path: string) => (path.endsWith('/modules') ? new Promise(() => {}) : Promise.resolve([])));
        void visit();

        await vi.waitFor(() => expect(mocks.resolveServerEventDetail).toHaveBeenCalledWith('e1'));
    });

    it('seeds the modules and the suggestions', async () => {
        expect(seededKeys(await visit())).toEqual([
            ['events', 'e1', 'modules'],
            ['events', 'e1', 'playlist-suggestions'],
        ]);
    });

    it("skips the suggestions when the plan doesn't include the playlist", async () => {
        mocks.resolveServerEventDetail.mockResolvedValue({ ...liveEvent, modules: [{ moduleKey: 'playlist', isAvailable: false, isEnabled: true }] });

        expect(seededKeys(await visit())).toEqual([['events', 'e1', 'modules']]);
    });

    it('seeds the suggestions even when the modules request fails', async () => {
        mocks.serverGet.mockImplementation((path: string) =>
            path.endsWith('/modules') ? Promise.reject(new Error('Server prefetch failed')) : Promise.resolve([]),
        );

        expect(seededKeys(await visit())).toEqual([['events', 'e1', 'playlist-suggestions']]);
    });

    it('prefetches nothing without a session', async () => {
        mocks.accessToken = null;

        expect(seededKeys(await visit())).toEqual([]);
        expect(mocks.serverGet).not.toHaveBeenCalled();
    });
});
