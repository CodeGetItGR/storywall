import type { DehydratedState } from '@tanstack/react-query';
import type { ReactElement } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
    resolveServerEventContext: vi.fn(),
    resolveServerEventDetail: vi.fn(),
    serverGet: vi.fn(),
}));

vi.mock('@/lib/auth/serverEventContext', () => ({
    resolveServerEventContext: mocks.resolveServerEventContext,
    resolveServerEventDetail: mocks.resolveServerEventDetail,
}));
vi.mock('@/lib/api/serverFetch', () => ({ serverGet: mocks.serverGet }));
vi.mock('@/i18n/serverLocale', () => ({ getServerLocale: async () => 'en' }));
vi.mock('./PageClient', () => ({ default: () => null }));

import Page from './page';

const hostContext = { accessToken: 'token-1', memberships: [], activeEventId: 'e1', isHost: true };
const liveEvent = { id: 'e1', status: 'ACTIVE', deletedAt: null, modules: [{ moduleKey: 'rsvp', isAvailable: true, isEnabled: true }] };

function visit(searchParams: { tab?: string; section?: string } = {}) {
    return Page({ params: Promise.resolve({ eventId: 'e1' }), searchParams: Promise.resolve(searchParams) });
}

function seededKeys(element: ReactElement) {
    const { state } = element.props as { state: DehydratedState };
    return state.queries.map((query) => query.queryKey);
}

describe('ManagePage (server)', () => {
    beforeEach(() => {
        mocks.resolveServerEventContext.mockReset().mockResolvedValue(hostContext);
        mocks.resolveServerEventDetail.mockReset().mockResolvedValue(liveEvent);
        mocks.serverGet.mockReset().mockResolvedValue([]);
    });

    it('asks for the event while the memberships are still loading', async () => {
        mocks.resolveServerEventContext.mockReturnValue(new Promise(() => {}));
        void visit();

        await vi.waitFor(() => expect(mocks.resolveServerEventDetail).toHaveBeenCalledWith('e1'));
    });

    it('requests usage and the guest lists together', async () => {
        mocks.serverGet.mockImplementation((path: string) => (path.endsWith('/usage') ? new Promise(() => {}) : Promise.resolve([])));
        void visit();

        await vi.waitFor(() => expect(mocks.serverGet).toHaveBeenCalledWith('/api/events/e1/members', 'token-1'));
    });

    it('seeds usage and every guest list', async () => {
        expect(seededKeys(await visit())).toEqual(
            expect.arrayContaining([
                ['events', 'e1', 'usage'],
                ['events', 'e1', 'members'],
                ['events', 'e1', 'rsvps'],
                ['events', 'e1', 'invitations'],
            ]),
        );
    });

    it('seeds usage even when a guest list request fails', async () => {
        mocks.serverGet.mockImplementation((path: string) =>
            path.endsWith('/members') ? Promise.reject(new Error('Server prefetch failed')) : Promise.resolve([]),
        );

        expect(seededKeys(await visit())).toEqual([['events', 'e1', 'usage']]);
    });

    it('prefetches only usage for a draft event', async () => {
        mocks.resolveServerEventDetail.mockResolvedValue({ ...liveEvent, status: 'DRAFT' });

        expect(seededKeys(await visit())).toEqual([['events', 'e1', 'usage']]);
    });

    it('prefetches nothing for a guest', async () => {
        mocks.resolveServerEventContext.mockResolvedValue({ ...hostContext, isHost: false });

        expect(seededKeys(await visit())).toEqual([]);
        expect(mocks.serverGet).not.toHaveBeenCalled();
    });

    it('prefetches nothing for a deleted event', async () => {
        mocks.resolveServerEventDetail.mockResolvedValue({ ...liveEvent, deletedAt: '2026-09-01T00:00:00Z' });

        expect(seededKeys(await visit())).toEqual([]);
        expect(mocks.serverGet).not.toHaveBeenCalled();
    });

    it("prefetches nothing when Spring can't return the event", async () => {
        mocks.resolveServerEventDetail.mockResolvedValue(null);

        expect(seededKeys(await visit())).toEqual([]);
        expect(mocks.serverGet).not.toHaveBeenCalled();
    });
});
