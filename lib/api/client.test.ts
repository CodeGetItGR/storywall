import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { api, ApiError } from '@/lib/api/client';
import type { AuthSessionDto } from '@/lib/api/types';
import { getAccessToken, setSession } from '@/lib/auth/tokenStore';

describe('api reactive re-authentication', () => {
    beforeEach(() => {
        setSession({ accessToken: 'stale', userId: 'u1' } as AuthSessionDto);
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    function fetchSequence(...responses: Array<Response | Error>) {
        const fetchMock = vi.fn();
        for (const r of responses) {
            if (r instanceof Error) fetchMock.mockRejectedValueOnce(r);
            else fetchMock.mockResolvedValueOnce(r);
        }
        vi.stubGlobal('fetch', fetchMock);
        return fetchMock;
    }

    it('drops the session when /api/auth/session says it is gone', async () => {
        fetchSequence(new Response(null, { status: 401 }), new Response(null, { status: 401 }));
        await expect(api.get('/api/me')).rejects.toMatchObject({ status: 401 });
        expect(getAccessToken()).toBeNull();
    });

    it.each([
        ['503', new Response(null, { status: 503 })],
        ['network', new TypeError('fetch failed')],
    ])('keeps the session when /api/auth/session cannot answer (%s)', async (_label, sessionResponse) => {
        fetchSequence(new Response(null, { status: 401 }), sessionResponse);
        await expect(api.get('/api/me')).rejects.toMatchObject({ status: 401 });
        expect(getAccessToken()).toBe('stale');
    });
});

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
            }),
        );
        vi.stubGlobal('fetch', fetchMock);

        await expect(api.publicPostForm('/api/qr/tok123/media', new FormData())).rejects.toBeInstanceOf(ApiError);
    });
});
