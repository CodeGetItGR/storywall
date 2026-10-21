import type { DehydratedState } from '@tanstack/react-query';
import type { ReactElement } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const serverGet = vi.fn();
vi.mock('@/lib/api/serverFetch', () => ({ serverGet: (...args: unknown[]) => serverGet(...args) }));
const ctx = vi.hoisted(() => ({ context: null as null | { accessToken: string; isHost: boolean }, event: null as unknown }));
vi.mock('@/lib/auth/serverEventContext', () => ({
    resolveServerEventContext: async () => ctx.context,
    resolveServerEventDetail: async () => ctx.event,
}));
vi.mock('./PageClient', () => ({ default: () => null }));

import Page from './page';

const VENDOR_EVENT = {
    id: 'e1',
    status: 'ACTIVE',
    deletedAt: null,
    modules: [{ moduleKey: 'vendors', isEnabled: true, isAvailable: true, configuration: {} }],
};

function visit() {
    return Page({ params: Promise.resolve({ eventId: 'e1' }) });
}

function seededKeys(element: ReactElement) {
    const { state } = element.props as { state: DehydratedState };
    return state.queries.map((query) => query.queryKey);
}

beforeEach(() => {
    serverGet.mockReset();
    ctx.context = { accessToken: 'tok', isHost: true };
    ctx.event = VENDOR_EVENT;
});

describe('Manage → Vendors prefetch', () => {
    it('fetches the links and the list for a host and seeds both keys', async () => {
        serverGet.mockResolvedValue([]);
        const element = await visit();
        expect(serverGet).toHaveBeenCalledWith('/api/events/e1/vendors/links', 'tok');
        expect(serverGet).toHaveBeenCalledWith('/api/events/e1/vendors', 'tok');
        expect(seededKeys(element)).toEqual(
            expect.arrayContaining([
                ['events', 'e1', 'vendors', 'links'],
                ['events', 'e1', 'vendors', 'list'],
            ]),
        );
    });

    it('fetches nothing for a guest, without the module, or on an in-app navigation', async () => {
        ctx.context = { accessToken: 'tok', isHost: false };
        await visit();
        ctx.context = { accessToken: 'tok', isHost: true };
        ctx.event = { ...VENDOR_EVENT, modules: [] };
        await visit();
        ctx.context = null;
        ctx.event = VENDOR_EVENT;
        await visit();
        expect(serverGet).not.toHaveBeenCalled();
    });

    it('fetches nothing for a deleted event', async () => {
        ctx.event = { ...VENDOR_EVENT, deletedAt: '2026-09-01T00:00:00Z' };
        await visit();
        expect(serverGet).not.toHaveBeenCalled();
    });

    it('still renders when Spring fails', async () => {
        serverGet.mockRejectedValue(new Error('down'));
        await expect(visit()).resolves.toBeTruthy();
    });
});
