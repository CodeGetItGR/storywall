import type { DehydratedState } from '@tanstack/react-query';
import type { ReactElement } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
    resolveServerEventContext: vi.fn(),
    resolveServerEventDetail: vi.fn(),
    serverGet: vi.fn(),
    serverGetOrNull: vi.fn(),
}));

vi.mock('@/lib/auth/serverEventContext', () => ({
    resolveServerEventContext: mocks.resolveServerEventContext,
    resolveServerEventDetail: mocks.resolveServerEventDetail,
}));
vi.mock('@/lib/api/serverFetch', () => ({ serverGet: mocks.serverGet, serverGetOrNull: mocks.serverGetOrNull }));
vi.mock('@/i18n/serverLocale', () => ({ getServerLocale: async () => 'en' }));
vi.mock('../PageClient', () => ({ default: () => null }));

import Page from './page';

const hostContext = { accessToken: 'token-1', memberships: [], activeEventId: 'e1', isHost: true };
const liveEvent = {
    id: 'e1',
    status: 'ACTIVE',
    deletedAt: null,
    schedule: { endAt: '2999-01-01T00:00:00Z' },
    modules: [{ moduleKey: 'rsvp', isAvailable: true, isEnabled: true }],
};

const themedEvent = { ...liveEvent, modules: [...liveEvent.modules, { moduleKey: 'theme', isAvailable: true, isEnabled: true }] };

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
        mocks.serverGetOrNull.mockReset().mockResolvedValue(null);
    });

    it('seeds the gift, null when the event is not one', async () => {
        const element = await visit();
        const { state } = element.props as { state: DehydratedState };
        const gift = state.queries.find((query) => query.queryKey.join('/') === 'events/e1/gift');
        expect(mocks.serverGetOrNull).toHaveBeenCalledWith('/api/events/e1/gift', 'token-1');
        expect(gift?.state.data).toBeNull();
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

    it('seeds usage and the gift even when a guest list request fails', async () => {
        mocks.serverGet.mockImplementation((path: string) =>
            path.endsWith('/members') ? Promise.reject(new Error('Server prefetch failed')) : Promise.resolve([]),
        );

        expect(seededKeys(await visit())).toEqual([
            ['events', 'e1', 'usage'],
            ['events', 'e1', 'gift'],
        ]);
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

    it('seeds the theme presets when the settings tab opens on a plan with themes', async () => {
        mocks.resolveServerEventDetail.mockResolvedValue(themedEvent);

        const element = await visit({ tab: 'settings' });

        expect(mocks.serverGet).toHaveBeenCalledWith('/api/events/e1/theme-presets', 'token-1');
        expect(seededKeys(element)).toEqual(expect.arrayContaining([['events', 'e1', 'theme-presets']]));
    });

    it('skips the theme presets once the event has ended (the server answers 5144)', async () => {
        mocks.resolveServerEventDetail.mockResolvedValue({ ...themedEvent, schedule: { endAt: '2020-01-01T00:00:00Z' } });

        await visit({ tab: 'settings' });

        expect(mocks.serverGet).not.toHaveBeenCalledWith('/api/events/e1/theme-presets', 'token-1');
    });

    it('skips the theme presets on other tabs', async () => {
        mocks.resolveServerEventDetail.mockResolvedValue(themedEvent);

        await visit();

        expect(mocks.serverGet).not.toHaveBeenCalledWith('/api/events/e1/theme-presets', 'token-1');
    });

    it("skips the theme presets when the plan doesn't include themes", async () => {
        await visit({ tab: 'settings' });

        expect(mocks.serverGet).not.toHaveBeenCalledWith('/api/events/e1/theme-presets', 'token-1');
    });

    it("seeds the theme presets for a draft's overview, whatever the tab", async () => {
        mocks.resolveServerEventDetail.mockResolvedValue({ ...themedEvent, status: 'DRAFT' });

        const element = await visit({ tab: 'members' });

        expect(mocks.serverGet).toHaveBeenCalledWith('/api/events/e1/theme-presets', 'token-1');
        expect(seededKeys(element)).toEqual([
            ['events', 'e1', 'usage'],
            ['events', 'e1', 'theme-presets'],
        ]);
    });

    it('still seeds the rest when the theme presets fail', async () => {
        mocks.resolveServerEventDetail.mockResolvedValue(themedEvent);
        mocks.serverGet.mockImplementation((path: string) =>
            path.endsWith('/theme-presets') ? Promise.reject(new Error('Server prefetch failed')) : Promise.resolve([]),
        );

        expect(seededKeys(await visit({ tab: 'settings' }))).toEqual(expect.arrayContaining([['events', 'e1', 'usage']]));
    });

    it("prefetches nothing when Spring can't return the event", async () => {
        mocks.resolveServerEventDetail.mockResolvedValue(null);

        expect(seededKeys(await visit())).toEqual([]);
        expect(mocks.serverGet).not.toHaveBeenCalled();
    });
});
