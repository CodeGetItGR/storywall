import { QueryClient } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { api } from '@/lib/api/client';
import { refreshEventOn4015 } from '@/lib/eventSuspension';

function respondWith(status: number, body: unknown) {
    vi.stubGlobal(
        'fetch',
        vi.fn(async () => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/problem+json' } })),
    );
}

describe('refreshEventOn4015', () => {
    let client: QueryClient;
    let unsubscribe: () => void;

    beforeEach(() => {
        client = new QueryClient();
        client.setQueryData(['events', 'e-1'], { id: 'e-1' });
        client.setQueryData(['events', 'e-1', 'billing'], {});
        client.setQueryData(['me', 'events'], []);
        unsubscribe = refreshEventOn4015(client);
    });

    afterEach(() => {
        unsubscribe();
        vi.unstubAllGlobals();
    });

    const invalidated = (key: readonly unknown[]) => client.getQueryState(key)?.isInvalidated ?? false;

    it('refetches the event details when a request is refused with 4015', async () => {
        respondWith(403, { status: 403, errorCode: 4015 });

        await expect(api.get('/api/events/e-1/posts')).rejects.toMatchObject({ status: 403 });

        expect(invalidated(['events', 'e-1'])).toBe(true);
        expect(invalidated(['events', 'e-1', 'billing'])).toBe(false);
        expect(invalidated(['me', 'events'])).toBe(false);
    });

    it('ignores any other 403', async () => {
        respondWith(403, { status: 403, errorCode: 4001 });

        await expect(api.get('/api/events/e-1/posts')).rejects.toMatchObject({ status: 403 });

        expect(invalidated(['events', 'e-1'])).toBe(false);
    });

    it('stops listening once unsubscribed', async () => {
        unsubscribe();
        respondWith(403, { status: 403, errorCode: 4015 });

        await expect(api.get('/api/events/e-1/posts')).rejects.toMatchObject({ status: 403 });

        expect(invalidated(['events', 'e-1'])).toBe(false);
    });
});
