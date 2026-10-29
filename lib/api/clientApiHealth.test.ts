import { afterEach, describe, expect, it, vi } from 'vitest';

import { api } from '@/lib/api/client';
import { isApiDown, resetApiHealth } from '@/lib/apiHealth';

describe('api client health reporting', () => {
    afterEach(() => {
        vi.unstubAllGlobals();
        resetApiHealth();
    });

    it('flags Spring as down after two 503s and clears after a success', async () => {
        const fetchMock = vi
            .fn()
            .mockResolvedValueOnce(new Response(null, { status: 503 }))
            .mockResolvedValueOnce(new Response(null, { status: 503 }))
            .mockResolvedValueOnce(new Response('[]', { status: 200, headers: { 'content-type': 'application/json' } }));
        vi.stubGlobal('fetch', fetchMock);

        await expect(api.publicGet('/api/config')).rejects.toBeTruthy();
        await expect(api.publicGet('/api/config')).rejects.toBeTruthy();
        expect(isApiDown()).toBe(true);
        await api.publicGet('/api/config');
        expect(isApiDown()).toBe(false);
    });

    it('counts a network error but not an aborted request', async () => {
        const abort = new DOMException('aborted', 'AbortError');
        vi.stubGlobal('fetch', vi.fn().mockRejectedValueOnce(abort).mockRejectedValueOnce(abort).mockRejectedValueOnce(abort));
        await expect(api.publicGet('/api/config')).rejects.toBe(abort);
        await expect(api.publicGet('/api/config')).rejects.toBe(abort);
        expect(isApiDown()).toBe(false);

        const failed = new TypeError('fetch failed');
        vi.stubGlobal('fetch', vi.fn().mockRejectedValue(failed));
        await expect(api.publicGet('/api/config')).rejects.toBe(failed);
        await expect(api.publicGet('/api/config')).rejects.toBe(failed);
        expect(isApiDown()).toBe(true);
    });
});
