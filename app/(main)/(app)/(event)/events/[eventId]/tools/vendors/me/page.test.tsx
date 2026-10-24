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
    modules: [moduleOf('vendors'), moduleOf('gallery')],
};
const PHOTOGRAPHER = { vendorId: 'v1', vendorType: 'PHOTOGRAPHER', capabilities: ['PRO_ALBUM'], accessOpen: true };
const PROFILE = { businessName: 'Studio X', vendorType: 'PHOTOGRAPHER', link: '@studio.x', logoUrl: null, partnerPromptDismissed: false };

function visit() {
    return Page({ params: Promise.resolve({ eventId: 'e1' }) });
}

function seededKeys(element: ReactElement) {
    const { state } = element.props as { state: DehydratedState };
    return state.queries.map((query) => query.queryKey);
}

function answer(me: unknown) {
    serverGetOrNull.mockImplementation(async (path: string) => (path.endsWith('/vendors/me') ? me : PROFILE));
}

beforeEach(() => {
    serverGet.mockReset();
    serverGetOrNull.mockReset();
    ctx.context = { accessToken: 'tok', isHost: false };
    ctx.event = VENDOR_EVENT;
});

describe('vendor page prefetch', () => {
    it('fetches the role, the profile and, for a photographer, the Pro first page', async () => {
        answer(PHOTOGRAPHER);
        serverGet.mockResolvedValue({ content: [], page: { number: 0, totalPages: 0, totalElements: 0, size: 30 } });
        const element = await visit();
        expect(serverGetOrNull).toHaveBeenCalledWith('/api/events/e1/vendors/me', 'tok');
        expect(serverGetOrNull).toHaveBeenCalledWith('/api/me/vendor-profile', 'tok');
        expect(serverGet).toHaveBeenCalledWith('/api/events/e1/media?page=0&size=30&collection=PRO', 'tok');
        expect(seededKeys(element)).toEqual(
            expect.arrayContaining([
                ['events', 'e1', 'vendors', 'me'],
                ['me', 'vendor-profile'],
                ['events', 'e1', 'media', 'PRO'],
            ]),
        );
    });

    it('skips the Pro page for other types, and without the gallery or vendors module', async () => {
        answer({ ...PHOTOGRAPHER, vendorType: 'MUSIC', capabilities: ['SONG_REQUESTS'] });
        await visit();
        answer(PHOTOGRAPHER);
        ctx.event = { ...VENDOR_EVENT, modules: [moduleOf('vendors')] };
        await visit();
        ctx.event = { ...VENDOR_EVENT, modules: [moduleOf('gallery')] };
        await visit();
        expect(serverGet).not.toHaveBeenCalled();
    });

    it('still fetches the role and profile with the vendors module off', async () => {
        answer({ ...PHOTOGRAPHER, capabilities: [], accessOpen: false, toolsOff: 'MODULE_OFF' });
        ctx.event = { ...VENDOR_EVENT, modules: [] };
        await visit();
        expect(serverGetOrNull).toHaveBeenCalledWith('/api/events/e1/vendors/me', 'tok');
        expect(serverGetOrNull).toHaveBeenCalledWith('/api/me/vendor-profile', 'tok');
        expect(serverGet).not.toHaveBeenCalled();
    });

    it('stops after the role for someone who is not a vendor', async () => {
        serverGetOrNull.mockResolvedValue(null);
        const element = await visit();
        expect(serverGetOrNull).toHaveBeenCalledTimes(1);
        expect(serverGet).not.toHaveBeenCalled();
        expect(seededKeys(element)).toEqual([['events', 'e1', 'vendors', 'me']]);
    });

    it('fetches nothing for a host or on an in-app navigation', async () => {
        ctx.context = { accessToken: 'tok', isHost: true };
        await visit();
        ctx.context = null;
        await visit();
        expect(serverGetOrNull).not.toHaveBeenCalled();
        expect(serverGet).not.toHaveBeenCalled();
    });

    it('still renders when Spring fails', async () => {
        serverGetOrNull.mockRejectedValue(new Error('down'));
        await expect(visit()).resolves.toBeTruthy();
    });
});

describe('vendor page print prefetch', () => {
    const PRINTER = { ...PHOTOGRAPHER, capabilities: ['PRINT_PICKS'], approvedPartner: true };
    const SERVICES = [{ id: 's1', kind: 'PRINT', label: '10x15', priceCents: 100, sortOrder: 0 }];

    beforeEach(() => {
        serverGet.mockImplementation(async (path: string) => {
            if (path.endsWith('/print-picks')) return { photographers: [] };
            if (path.includes('/print-lists/host')) return { id: 'l1', items: [] };
            return SERVICES;
        });
    });

    it('seeds the context, the own host list and the sizes', async () => {
        answer(PRINTER);
        const keys = seededKeys(await visit());
        expect(serverGet).toHaveBeenCalledWith('/api/events/e1/print-lists/host?vendorId=v1', 'tok');
        expect(keys).toEqual(
            expect.arrayContaining([
                ['events', 'e1', 'print-picks'],
                ['events', 'e1', 'print-lists', 'host', 'v1'],
                ['me', 'vendor-profile', 'services'],
            ]),
        );
    });

    it('skips prints without the capability and sizes without approval', async () => {
        answer({ ...PRINTER, capabilities: [], approvedPartner: false });
        await visit();
        expect(serverGet).not.toHaveBeenCalledWith(expect.stringContaining('print-'), expect.anything());
        expect(serverGet).not.toHaveBeenCalledWith('/api/me/vendor-profile/services', expect.anything());
    });

    it('keeps the profile when a print request fails', async () => {
        answer(PRINTER);
        serverGet.mockImplementation(async (path: string) => {
            if (path.includes('media')) return { content: [], page: 0 };
            throw new Error('down');
        });
        expect(seededKeys(await visit())).toEqual(expect.arrayContaining([['me', 'vendor-profile']]));
    });
});
