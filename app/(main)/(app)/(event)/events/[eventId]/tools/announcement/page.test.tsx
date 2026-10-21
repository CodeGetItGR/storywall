import type { DehydratedState } from '@tanstack/react-query';
import type { ReactElement } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const serverGetOrNull = vi.fn();
vi.mock('@/lib/api/serverFetch', () => ({ serverGetOrNull: (...args: unknown[]) => serverGetOrNull(...args) }));
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
    serverGetOrNull.mockReset().mockResolvedValue({ vendorType: 'PLANNER', capabilities: ['ANNOUNCE'], accessOpen: true });
    ctx.context = { accessToken: 'tok', isHost: false };
});

describe('Announcement page prefetch', () => {
    it("seeds the member's vendor role", async () => {
        expect(seededKeys(await visit())).toEqual([['events', 'e1', 'vendors', 'me']]);
        expect(serverGetOrNull).toHaveBeenCalledWith('/api/events/e1/vendors/me', 'tok');
    });

    it('asks a host nothing, and fetches nothing on an in-app navigation', async () => {
        ctx.context = { accessToken: 'tok', isHost: true };
        expect(seededKeys(await visit())).toEqual([]);
        ctx.context = null;
        expect(seededKeys(await visit())).toEqual([]);
        expect(serverGetOrNull).not.toHaveBeenCalled();
    });

    it('renders the page when the role cannot be fetched', async () => {
        serverGetOrNull.mockRejectedValue(new Error('down'));
        expect(seededKeys(await visit())).toEqual([]);
    });
});
