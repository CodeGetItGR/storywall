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
    ctx.context = { accessToken: 'tok', isHost: false };
    ctx.event = VENDOR_EVENT;
});

describe('vendor list prefetch', () => {
    it('fetches the list for any member when the module is on', async () => {
        serverGet.mockResolvedValue([]);
        const element = await visit();
        expect(serverGet).toHaveBeenCalledWith('/api/events/e1/vendors', 'tok');
        expect(seededKeys(element)).toEqual([['events', 'e1', 'vendors', 'list']]);
    });

    it('fetches nothing without the module or a full page load', async () => {
        ctx.event = { ...VENDOR_EVENT, modules: [] };
        await visit();
        ctx.event = VENDOR_EVENT;
        ctx.context = null;
        await visit();
        expect(serverGet).not.toHaveBeenCalled();
    });

    it('still renders when Spring fails', async () => {
        serverGet.mockRejectedValue(new Error('down'));
        await expect(visit()).resolves.toBeTruthy();
    });
});
