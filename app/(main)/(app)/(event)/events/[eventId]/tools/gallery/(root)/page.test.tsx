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
vi.mock('../PageClient', () => ({ default: () => null }));

import Page from './page';

const hostContext = { accessToken: 'token-1', memberships: [], activeEventId: 'e1', isHost: true };
const liveEvent = { id: 'e1', status: 'ACTIVE', deletedAt: null, modules: [{ moduleKey: 'gallery', isAvailable: true, isEnabled: true }] };
const firstPage = { content: [], page: 0 };

function visit() {
    return Page({ params: Promise.resolve({ eventId: 'e1' }) });
}

function seededQueries(element: ReactElement) {
    const { state } = element.props as { state: DehydratedState };
    return state.queries.map((query) => ({ key: query.queryKey, data: query.state.data }));
}

describe('GalleryPage (server)', () => {
    beforeEach(() => {
        mocks.resolveServerEventContext.mockReset().mockResolvedValue(hostContext);
        mocks.resolveServerEventDetail.mockReset().mockResolvedValue(liveEvent);
        mocks.serverGet.mockReset().mockResolvedValue(firstPage);
    });

    it('asks for the event while the memberships are still loading', async () => {
        mocks.resolveServerEventContext.mockReturnValue(new Promise(() => {}));
        void visit();

        await vi.waitFor(() => expect(mocks.resolveServerEventDetail).toHaveBeenCalledWith('e1'));
    });

    it("seeds the gallery's first page", async () => {
        expect(seededQueries(await visit())).toEqual([{ key: ['events', 'e1', 'media'], data: { pages: [firstPage], pageParams: [0] } }]);
    });

    it("seeds a deleted event's gallery while it's still enabled", async () => {
        mocks.resolveServerEventDetail.mockResolvedValue({
            ...liveEvent,
            deletedAt: '2026-09-01T00:00:00Z',
            modules: [{ moduleKey: 'gallery', isAvailable: false, isEnabled: true }],
        });

        expect(seededQueries(await visit())).toHaveLength(1);
    });

    it('prefetches nothing for a guest', async () => {
        mocks.resolveServerEventContext.mockResolvedValue({ ...hostContext, isHost: false });

        expect(seededQueries(await visit())).toEqual([]);
        expect(mocks.serverGet).not.toHaveBeenCalled();
    });

    it("seeds a guest's gallery when members get the download", async () => {
        mocks.resolveServerEventContext.mockResolvedValue({ ...hostContext, isHost: false });
        mocks.resolveServerEventDetail.mockResolvedValue({
            ...liveEvent,
            modules: [{ moduleKey: 'gallery', isAvailable: true, isEnabled: true, configuration: { memberArchiveAfterEnd: true } }],
        });

        expect(seededQueries(await visit())).toEqual([{ key: ['events', 'e1', 'media'], data: { pages: [firstPage], pageParams: [0] } }]);
    });

    it('prefetches nothing without a session', async () => {
        mocks.resolveServerEventContext.mockResolvedValue(null);
        mocks.resolveServerEventDetail.mockResolvedValue({
            ...liveEvent,
            modules: [{ moduleKey: 'gallery', isAvailable: true, isEnabled: true, configuration: { memberArchiveAfterEnd: true } }],
        });

        expect(seededQueries(await visit())).toEqual([]);
        expect(mocks.serverGet).not.toHaveBeenCalled();
    });

    it("prefetches nothing when the plan doesn't include the gallery", async () => {
        mocks.resolveServerEventDetail.mockResolvedValue({ ...liveEvent, modules: [{ moduleKey: 'gallery', isAvailable: false, isEnabled: true }] });

        expect(seededQueries(await visit())).toEqual([]);
        expect(mocks.serverGet).not.toHaveBeenCalled();
    });

    it("prefetches nothing when Spring can't return the event", async () => {
        mocks.resolveServerEventDetail.mockResolvedValue(null);

        expect(seededQueries(await visit())).toEqual([]);
        expect(mocks.serverGet).not.toHaveBeenCalled();
    });

    it('prefetches nothing when the media request fails', async () => {
        mocks.serverGet.mockRejectedValue(new Error('Server prefetch failed'));

        expect(seededQueries(await visit())).toEqual([]);
    });

    describe('with the Pro album', () => {
        const vendors = { moduleKey: 'vendors', isAvailable: true, isEnabled: true, configuration: {} };

        it('also seeds the Pro first page when the vendors module is on', async () => {
            mocks.resolveServerEventDetail.mockResolvedValue({ ...liveEvent, modules: [...liveEvent.modules, vendors] });

            expect(seededQueries(await visit())).toEqual([
                { key: ['events', 'e1', 'media'], data: { pages: [firstPage], pageParams: [0] } },
                { key: ['events', 'e1', 'media', 'PRO'], data: { pages: [firstPage], pageParams: [0] } },
            ]);
            expect(mocks.serverGet).toHaveBeenCalledWith('/api/events/e1/media?page=0&size=30', 'token-1');
            expect(mocks.serverGet).toHaveBeenCalledWith('/api/events/e1/media?page=0&size=30&collection=PRO', 'token-1');
        });

        it('fetches only the guest page without the vendors module', async () => {
            await visit();

            expect(mocks.serverGet).toHaveBeenCalledTimes(1);
        });

        it('keeps the guest page when the Pro page fails', async () => {
            mocks.resolveServerEventDetail.mockResolvedValue({ ...liveEvent, modules: [...liveEvent.modules, vendors] });
            mocks.serverGet.mockImplementation((path: string) =>
                path.includes('collection=PRO') ? Promise.reject(new Error('Pro prefetch failed')) : Promise.resolve(firstPage),
            );

            expect(seededQueries(await visit())).toEqual([{ key: ['events', 'e1', 'media'], data: { pages: [firstPage], pageParams: [0] } }]);
        });
    });
});
