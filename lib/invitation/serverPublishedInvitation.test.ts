// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SAMPLE_DOCUMENT, SAMPLE_THEME } from '@/lib/invitation/samples';

const requestHeaders = vi.hoisted(() => ({ current: new Headers() }));
vi.mock('next/headers', () => ({ headers: async () => requestHeaders.current }));
vi.mock('@/i18n/serverLocale', () => ({ getServerLocale: async () => 'el' }));

import { fetchPublishedInvitation } from '@/lib/invitation/serverPublishedInvitation';

const fetchMock = vi.fn();

function answer(status: number, body: unknown = null) {
    return new Response(body === null ? null : JSON.stringify(body), { status });
}

beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
    requestHeaders.current = new Headers({ 'x-forwarded-for': '203.0.113.7, 10.0.0.1' });
});

afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
});

describe('fetchPublishedInvitation', () => {
    it('reads the public copy uncached, in the guest language, with the guest address', async () => {
        vi.stubEnv('CLIENT_IP_FORWARDING_SECRET', 'shh');
        fetchMock.mockResolvedValue(answer(200, { slug: 'abc', design: SAMPLE_THEME, document: SAMPLE_DOCUMENT, imageUrls: {} }));

        const state = await fetchPublishedInvitation('maria-and-nikos');

        expect(state.kind).toBe('found');
        const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
        expect(url).toMatch(/\/api\/public\/invitations\/maria-and-nikos$/);
        expect(init.cache).toBe('no-store');
        expect(init.headers).toEqual({
            'Accept-Language': 'el',
            'X-Storywall-Client-Ip': '203.0.113.7',
            'X-Storywall-Client-Ip-Secret': 'shh',
        });
    });

    it('sends no address without the shared secret', async () => {
        vi.stubEnv('CLIENT_IP_FORWARDING_SECRET', '');
        fetchMock.mockResolvedValue(answer(404));
        expect(await fetchPublishedInvitation('no-secret')).toEqual({ kind: 'not-found' });
        expect((fetchMock.mock.calls[0] as [string, RequestInit])[1].headers).toEqual({ 'Accept-Language': 'el' });
    });

    it('maps an expired link and a failing backend', async () => {
        fetchMock.mockResolvedValueOnce(answer(410, { errorCode: 5221 }));
        expect(await fetchPublishedInvitation('expired-one')).toEqual({ kind: 'expired' });
        fetchMock.mockRejectedValueOnce(new TypeError('fetch failed'));
        expect(await fetchPublishedInvitation('offline-one')).toEqual({ kind: 'error' });
    });

    it('never asks the backend about a link it would not give out', async () => {
        expect(await fetchPublishedInvitation('Not_A_Slug')).toEqual({ kind: 'not-found' });
        expect(fetchMock).not.toHaveBeenCalled();
    });
});
