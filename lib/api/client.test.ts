import { afterEach, describe, expect, it, vi } from 'vitest';

import { api, ApiError } from '@/lib/api/client';

describe('api.publicPostForm', () => {
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('posts FormData with no Authorization header and returns the parsed JSON body', async () => {
        const fetchMock = vi
            .fn()
            .mockResolvedValue(new Response(JSON.stringify({ id: 'media-1' }), { status: 201, headers: { 'content-type': 'application/json' } }));
        vi.stubGlobal('fetch', fetchMock);

        const formData = new FormData();
        formData.append('file', new Blob(['x']), 'x.jpg');

        const result = await api.publicPostForm<{ id: string }>('/api/qr/tok123/media', formData);

        expect(result).toEqual({ id: 'media-1' });
        const [, init] = fetchMock.mock.calls[0];
        expect(init.headers?.Authorization).toBeUndefined();
        expect(init.body).toBe(formData);
    });

    it('throws ApiError with the parsed problem body on failure', async () => {
        const fetchMock = vi.fn().mockResolvedValue(
            new Response(JSON.stringify({ errorCode: 2005, detail: 'not available' }), {
                status: 409,
                headers: { 'content-type': 'application/problem+json' },
            })
        );
        vi.stubGlobal('fetch', fetchMock);

        await expect(api.publicPostForm('/api/qr/tok123/media', new FormData())).rejects.toBeInstanceOf(ApiError);
    });
});
