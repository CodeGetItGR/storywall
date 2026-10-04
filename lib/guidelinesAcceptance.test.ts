import { QueryClient } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { api } from '@/lib/api/client';
import { reopenAcceptanceGate } from '@/lib/guidelinesAcceptance';

function respondWith(status: number, body: unknown) {
    vi.stubGlobal(
        'fetch',
        vi.fn(async () => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/problem+json' } })),
    );
}

// Direct api.* calls, the way hooks/useProfileForm saves, not through React Query.
describe('reopenAcceptanceGate', () => {
    let client: QueryClient;
    let invalidate: ReturnType<typeof vi.spyOn>;
    let unsubscribe: () => void;

    beforeEach(() => {
        client = new QueryClient();
        invalidate = vi.spyOn(client, 'invalidateQueries');
        unsubscribe = reopenAcceptanceGate(client);
    });

    afterEach(() => {
        unsubscribe();
        vi.unstubAllGlobals();
    });

    it.each([
        ['the Community Guidelines', 4013],
        ['the Terms of Use', 4020],
    ])('refetches me when a write is refused for %s (%i), so the gate reopens', async (_, errorCode) => {
        respondWith(403, { status: 403, errorCode });

        await expect(api.patch('/api/me', { firstName: 'Ada' })).rejects.toMatchObject({ status: 403 });

        expect(invalidate).toHaveBeenCalledTimes(1);
        expect(invalidate).toHaveBeenCalledWith({ queryKey: ['me'], exact: true });
    });

    it('ignores any other 403', async () => {
        respondWith(403, { status: 403, errorCode: 4001 });

        await expect(api.patch('/api/me', { firstName: 'Ada' })).rejects.toMatchObject({ status: 403 });

        expect(invalidate).not.toHaveBeenCalled();
    });

    it('stops listening once unsubscribed', async () => {
        unsubscribe();
        respondWith(403, { status: 403, errorCode: 4013 });

        await expect(api.post('/api/events', {})).rejects.toMatchObject({ status: 403 });

        expect(invalidate).not.toHaveBeenCalled();
    });
});
