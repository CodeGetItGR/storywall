import type { DehydratedState } from '@tanstack/react-query';
import type { ReactElement } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const serverGet = vi.fn();
const serverGetOrNull = vi.fn();
vi.mock('@/lib/api/serverFetch', () => ({
    serverGet: (...args: unknown[]) => serverGet(...args),
    serverGetOrNull: (...args: unknown[]) => serverGetOrNull(...args),
}));
const ctx = vi.hoisted(() => ({ context: null as null | { accessToken: string; isHost: boolean } }));
vi.mock('@/lib/auth/serverEventContext', () => ({ resolveServerEventContext: async () => ctx.context }));
vi.mock('./PageClient', () => ({ default: () => null }));

import Page from './page';

function visit() {
    return Page({ params: Promise.resolve({ eventId: 'e1' }) });
}

function seededKeys(element: ReactElement) {
    const { state } = element.props as { state: DehydratedState };
    return state.queries.map((query) => query.queryKey);
}

beforeEach(() => {
    serverGet.mockReset().mockResolvedValue([]);
    serverGetOrNull.mockReset().mockResolvedValue(null);
    ctx.context = { accessToken: 'tok', isHost: true };
});

describe('Share links prefetch', () => {
    it('seeds the links, stats and usage for a host, and never asks about vendors', async () => {
        const element = await visit();
        expect(seededKeys(element)).toEqual(
            expect.arrayContaining([
                ['events', 'e1', 'qr-links'],
                ['events', 'e1', 'qr-links', 'stats'],
                ['events', 'e1', 'usage'],
            ]),
        );
        expect(serverGetOrNull).not.toHaveBeenCalled();
    });

    it('seeds the role and the links only for a planner with the tool open', async () => {
        ctx.context = { accessToken: 'tok', isHost: false };
        serverGetOrNull.mockResolvedValue({ vendorType: 'PLANNER', capabilities: ['QR_READ'], accessOpen: true });
        const element = await visit();
        expect(seededKeys(element)).toEqual([
            ['events', 'e1', 'vendors', 'me'],
            ['events', 'e1', 'qr-links'],
        ]);
        expect(serverGet).toHaveBeenCalledTimes(1);
        expect(serverGet).toHaveBeenCalledWith('/api/events/e1/qr-links', 'tok');
    });

    it('fetches no links for a member who is not a planner, or whose access ended', async () => {
        ctx.context = { accessToken: 'tok', isHost: false };
        await visit();
        serverGetOrNull.mockResolvedValue({ vendorType: 'PLANNER', capabilities: [], accessOpen: false });
        await visit();
        expect(serverGet).not.toHaveBeenCalled();
    });

    it('fetches nothing on an in-app navigation', async () => {
        ctx.context = null;
        expect(seededKeys(await visit())).toEqual([]);
        expect(serverGet).not.toHaveBeenCalled();
        expect(serverGetOrNull).not.toHaveBeenCalled();
    });
});
