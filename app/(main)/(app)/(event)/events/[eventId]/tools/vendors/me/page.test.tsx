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
    const CONTEXT = { photographers: [] };
    const HOST_LIST = { id: 'l1', items: [] };
    const PRO_PAGE = { content: [], page: 0 };

    beforeEach(() => {
        serverGet.mockImplementation(async (path: string) => {
            if (path.endsWith('/print-picks')) return CONTEXT;
            if (path.includes('/print-lists/host')) return HOST_LIST;
            if (path.includes('/services')) return SERVICES;
            return PRO_PAGE;
        });
    });

    function seeded(element: ReactElement) {
        const { state } = element.props as { state: DehydratedState };
        return state.queries.map((query) => ({ key: query.queryKey, data: query.state.data }));
    }

    const CONTEXT_ENTRY = { key: ['events', 'e1', 'print-picks'], data: CONTEXT };
    const LIST_ENTRY = { key: ['events', 'e1', 'print-lists', 'host', 'v1'], data: HOST_LIST };
    const SERVICES_ENTRY = { key: ['me', 'vendor-profile', 'services'], data: SERVICES };

    it('seeds the context, the own host list and the sizes', async () => {
        answer(PRINTER);
        const entries = seeded(await visit());
        expect(serverGet).toHaveBeenCalledWith('/api/events/e1/print-lists/host?vendorId=v1', 'tok');
        expect(entries).toEqual(expect.arrayContaining([CONTEXT_ENTRY, LIST_ENTRY, SERVICES_ENTRY]));
    });

    it('seeds no prints without the capability', async () => {
        answer({ ...PRINTER, capabilities: [] });
        const entries = seeded(await visit());
        expect(entries).not.toContainEqual(CONTEXT_ENTRY);
        expect(entries).not.toContainEqual(LIST_ENTRY);
        expect(entries).toContainEqual(SERVICES_ENTRY);
    });

    it('seeds no sizes when the photographer is not approved', async () => {
        answer({ ...PRINTER, approvedPartner: false });
        const entries = seeded(await visit());
        expect(entries).not.toContainEqual(SERVICES_ENTRY);
        expect(entries).toEqual(expect.arrayContaining([CONTEXT_ENTRY, LIST_ENTRY]));
    });

    it('seeds no sizes for an approved partner that is not a photographer', async () => {
        answer({ ...PRINTER, vendorType: 'MUSIC' });
        const entries = seeded(await visit());
        expect(entries).not.toContainEqual(SERVICES_ENTRY);
        expect(entries).toEqual(expect.arrayContaining([CONTEXT_ENTRY, LIST_ENTRY]));
    });

    it('seeds the host list but not the context when the vendors module is not readable', async () => {
        answer(PRINTER);
        ctx.event = { ...VENDOR_EVENT, modules: [moduleOf('gallery')] };
        const entries = seeded(await visit());
        expect(entries).not.toContainEqual(CONTEXT_ENTRY);
        expect(entries).toContainEqual(LIST_ENTRY);
    });

    it('keeps the profile when the print and services requests fail', async () => {
        answer(PRINTER);
        serverGet.mockImplementation(async (path: string) => {
            if (path.includes('media')) return PRO_PAGE;
            throw new Error('down');
        });
        expect(seededKeys(await visit())).toEqual(expect.arrayContaining([['me', 'vendor-profile']]));
    });
});
