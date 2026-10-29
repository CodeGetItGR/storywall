import type { DehydratedState } from '@tanstack/react-query';
import type { ReactElement } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const serverGet = vi.fn();
vi.mock('@/lib/api/serverFetch', () => ({ serverGet: (...args: unknown[]) => serverGet(...args) }));
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
    serverGet.mockReset().mockImplementation(async (path: string) => (path.endsWith('/qr-card-templates') ? { available: true, templates: [] } : []));
    ctx.context = { accessToken: 'tok', isHost: true };
});

describe('Gallery QR prefetch', () => {
    it('seeds the links and the card designs for a host', async () => {
        const keys = seededKeys(await visit());
        expect(keys).toEqual(
            expect.arrayContaining([
                ['events', 'e1', 'qr-links'],
                ['events', 'e1', 'qr-card-templates'],
            ]),
        );
        expect(keys).toHaveLength(2);
    });

    it('fetches nothing for a guest or on an in-app navigation', async () => {
        ctx.context = { accessToken: 'tok', isHost: false };
        expect(seededKeys(await visit())).toEqual([]);
        ctx.context = null;
        expect(seededKeys(await visit())).toEqual([]);
        expect(serverGet).not.toHaveBeenCalled();
    });
});
