import type { DehydratedState } from '@tanstack/react-query';
import type { ReactElement } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const serverGet = vi.fn();
const serverGetOrNull = vi.fn();
vi.mock('@/lib/api/serverFetch', () => ({
    serverGet: (...args: unknown[]) => serverGet(...args),
    serverGetOrNull: (...args: unknown[]) => serverGetOrNull(...args),
}));
const ctx = vi.hoisted(() => ({ context: null as null | { accessToken: string; isHost: boolean }, event: null as unknown }));
vi.mock('@/lib/auth/serverEventContext', () => ({
    resolveServerEventContext: async () => ctx.context,
    resolveServerEventDetail: async () => ctx.event,
}));
vi.mock('./PageClient', () => ({ default: () => null }));

import Page from './page';

const moduleOf = (moduleKey: string) => ({ moduleKey, isEnabled: true, isAvailable: true, configuration: {} });
const VENDOR_EVENT = {
    id: 'e1',
    status: 'ACTIVE',
    deletedAt: null,
    modules: [moduleOf('playlist'), moduleOf('vendors')],
};
const DJ = { vendorId: 'v1', vendorType: 'MUSIC', capabilities: ['SONG_REQUESTS'], accessOpen: true };
const LEADERBOARD_PATH = '/api/events/e1/playlist-suggestions/leaderboard';

function visit() {
    return Page({ params: Promise.resolve({ eventId: 'e1' }) });
}

function seededKeys(element: ReactElement) {
    const { state } = element.props as { state: DehydratedState };
    return state.queries.map((query) => query.queryKey);
}

beforeEach(() => {
    serverGet.mockReset();
    serverGetOrNull.mockReset();
    ctx.context = { accessToken: 'tok', isHost: false };
    ctx.event = VENDOR_EVENT;
});

describe('live list prefetch', () => {
    it('fetches the leaderboard for a host, without the vendor role', async () => {
        ctx.context = { accessToken: 'tok', isHost: true };
        serverGet.mockResolvedValue([]);
        const element = await visit();
        expect(serverGet).toHaveBeenCalledWith(LEADERBOARD_PATH, 'tok');
        expect(serverGetOrNull).not.toHaveBeenCalled();
        expect(seededKeys(element)).toEqual([['events', 'e1', 'playlist-suggestions', 'leaderboard']]);
    });

    it('fetches the role, then the leaderboard, for a DJ', async () => {
        serverGetOrNull.mockResolvedValue(DJ);
        serverGet.mockResolvedValue([]);
        const element = await visit();
        expect(serverGetOrNull).toHaveBeenCalledWith('/api/events/e1/vendors/me', 'tok');
        expect(serverGet).toHaveBeenCalledWith(LEADERBOARD_PATH, 'tok');
        expect(seededKeys(element)).toEqual(
            expect.arrayContaining([
                ['events', 'e1', 'vendors', 'me'],
                ['events', 'e1', 'playlist-suggestions', 'leaderboard'],
            ]),
        );
    });

    it('stops after the role for a guest or a vendor without the tool', async () => {
        serverGetOrNull.mockResolvedValue({ ...DJ, vendorType: 'PLANNER', capabilities: ['SCHEDULE_EDIT'] });
        await visit();
        serverGetOrNull.mockResolvedValue({ ...DJ, accessOpen: false, capabilities: [], toolsOff: 'ACCESS_ENDED' });
        await visit();
        serverGetOrNull.mockResolvedValue(null);
        await visit();
        expect(serverGet).not.toHaveBeenCalled();
    });

    it('fetches no leaderboard without the playlist module, and still renders when Spring fails', async () => {
        ctx.context = { accessToken: 'tok', isHost: true };
        ctx.event = { ...VENDOR_EVENT, modules: [moduleOf('vendors')] };
        await visit();
        expect(serverGet).not.toHaveBeenCalled();
        ctx.event = VENDOR_EVENT;
        serverGet.mockRejectedValue(new Error('down'));
        await expect(visit()).resolves.toBeTruthy();
    });

    it('fetches nothing on an in-app navigation', async () => {
        ctx.context = null;
        await visit();
        expect(serverGet).not.toHaveBeenCalled();
        expect(serverGetOrNull).not.toHaveBeenCalled();
    });
});
