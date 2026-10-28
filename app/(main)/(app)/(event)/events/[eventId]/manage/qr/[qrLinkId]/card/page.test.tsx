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

const LINKS = ['events', 'e1', 'qr-links'];
const TEMPLATES = ['events', 'e1', 'qr-card-templates'];

function visit() {
    return Page({ params: Promise.resolve({ eventId: 'e1', qrLinkId: 'qr-1' }) });
}

function seededKeys(element: ReactElement) {
    const { state } = element.props as { state: DehydratedState };
    return state.queries.map((query) => query.queryKey);
}

beforeEach(() => {
    serverGet.mockReset().mockImplementation(async (path: string) => (path.endsWith('/qr-card-templates') ? { available: true, templates: [] } : []));
    serverGetOrNull.mockReset().mockResolvedValue(null);
    ctx.context = { accessToken: 'tok', isHost: true };
});

describe('QR card page prefetch', () => {
    it('seeds the links and the designs for a host, and never asks about vendors', async () => {
        const keys = seededKeys(await visit());
        expect(keys).toEqual(expect.arrayContaining([LINKS, TEMPLATES]));
        expect(keys).toHaveLength(2);
        expect(serverGetOrNull).not.toHaveBeenCalled();
    });

    it('seeds the role, the links and the designs for a planner with the tool open', async () => {
        ctx.context = { accessToken: 'tok', isHost: false };
        serverGetOrNull.mockResolvedValue({ vendorType: 'PLANNER', capabilities: ['QR_READ'], accessOpen: true });
        const keys = seededKeys(await visit());
        expect(keys).toEqual(expect.arrayContaining([['events', 'e1', 'vendors', 'me'], LINKS, TEMPLATES]));
        expect(keys).toHaveLength(3);
    });

    it('fetches neither for a member without the tool', async () => {
        ctx.context = { accessToken: 'tok', isHost: false };
        await visit();
        expect(serverGet).not.toHaveBeenCalled();
    });

    it('keeps the links when the designs fail', async () => {
        serverGet.mockImplementation(async (path: string) => {
            if (path.endsWith('/qr-card-templates')) throw new Error('down');
            return [];
        });
        expect(seededKeys(await visit())).toEqual([LINKS]);
    });

    it('fetches nothing on an in-app navigation', async () => {
        ctx.context = null;
        expect(seededKeys(await visit())).toEqual([]);
        expect(serverGet).not.toHaveBeenCalled();
        expect(serverGetOrNull).not.toHaveBeenCalled();
    });
});
