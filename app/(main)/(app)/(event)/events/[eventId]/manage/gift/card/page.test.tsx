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
    serverGet.mockReset().mockResolvedValue({ available: true, templates: [] });
    serverGetOrNull.mockReset().mockResolvedValue({ token: 'tok', status: 'ISSUED' });
    ctx.context = { accessToken: 'tok', isHost: true };
});

describe('Gift card prefetch', () => {
    it('seeds the card designs for a host, next to the gift', async () => {
        const keys = seededKeys(await visit());
        expect(serverGet).toHaveBeenCalledWith('/api/events/e1/qr-card-templates', 'tok');
        expect(keys).toEqual(expect.arrayContaining([['events', 'e1', 'qr-card-templates']]));
    });

    it('fetches nothing for a guest or on an in-app navigation', async () => {
        ctx.context = { accessToken: 'tok', isHost: false };
        await visit();
        ctx.context = null;
        await visit();
        expect(serverGet).not.toHaveBeenCalled();
        expect(serverGetOrNull).not.toHaveBeenCalled();
    });
});
