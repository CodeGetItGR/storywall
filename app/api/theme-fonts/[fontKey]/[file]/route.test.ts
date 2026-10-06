import { NextRequest } from 'next/server';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { GET, HEAD } from './route';

function request(fontKey: string, file: string, headers: Record<string, string> = {}, method = 'GET') {
    return new NextRequest(`https://storywall.test/api/theme-fonts/${fontKey}/${file}`, { headers, method });
}

function call(fontKey: string, file: string, headers: Record<string, string> = {}) {
    return GET(request(fontKey, file, headers), { params: Promise.resolve({ fontKey, file }) });
}

describe('GET /api/theme-fonts/[fontKey]/[file]', () => {
    afterEach(() => {
        vi.unstubAllGlobals();
        vi.unstubAllEnvs();
    });

    it('proxies the backend file with immutable caching and forwards the client address', async () => {
        vi.stubEnv('CLIENT_IP_FORWARDING_SECRET', 's3cret');
        const fetchMock = vi.fn().mockResolvedValue(new Response(new Uint8Array([119, 79, 70, 50]), { status: 200 }));
        vi.stubGlobal('fetch', fetchMock);

        const response = await call('dino-serif', '3.woff2', { 'x-forwarded-for': '203.0.113.9' });

        expect(response.status).toBe(200);
        expect(response.headers.get('content-type')).toBe('font/woff2');
        expect(response.headers.get('cache-control')).toBe('public, max-age=31536000, s-maxage=31536000, immutable');
        expect(new Uint8Array(await response.arrayBuffer())).toEqual(new Uint8Array([119, 79, 70, 50]));
        const [url, init] = fetchMock.mock.calls[0];
        expect(url).toMatch(/\/api\/theme-fonts\/dino-serif\/3\.woff2$/);
        expect(init.method).toBe('GET');
        // The client-IP secret must never follow a redirect to another host.
        expect(init.redirect).toBe('error');
        expect(init.headers['X-Storywall-Client-Ip']).toBe('203.0.113.9');
        expect(init.headers['X-Storywall-Client-Ip-Secret']).toBe('s3cret');
    });

    it('404s a malformed key or file name without calling the backend', async () => {
        const fetchMock = vi.fn();
        vi.stubGlobal('fetch', fetchMock);

        for (const [fontKey, file] of [
            ['../etc', '1.woff2'],
            ['dino-serif', '1.ttf'],
            ['dino-serif', '03.woff2'], // the backend rejects leading zeros too
        ]) {
            const response = await call(fontKey, file);
            expect(response.status, `${fontKey}/${file}`).toBe(404);
            expect(response.headers.get('cache-control')).toBe('no-store');
        }
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it('passes a backend 404 through, uncached', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 404 })));

        const response = await call('dino-serif', '2.woff2');

        expect(response.status).toBe(404);
        expect(response.headers.get('cache-control')).toBe('no-store');
    });

    it.each([204, 206, 502, 503])('turns a backend %i into an uncached 502', async (status) => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status })));

        const response = await call('dino-serif', '2.woff2');

        expect(response.status).toBe(502);
        expect(response.headers.get('cache-control')).toBe('no-store');
    });

    it('answers an uncached 502 when the backend body fails mid-read', async () => {
        const broken = new ReadableStream({
            start(controller) {
                controller.error(new Error('reset'));
            },
        });
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(broken, { status: 200 })));

        const response = await call('dino-serif', '2.woff2');

        expect(response.status).toBe(502);
        expect(response.headers.get('cache-control')).toBe('no-store');
    });

    it('answers an uncached 502 when the backend is unreachable', async () => {
        vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('ECONNREFUSED')));

        const response = await call('dino-serif', '2.woff2');

        expect(response.status).toBe(502);
        expect(response.headers.get('cache-control')).toBe('no-store');
    });
});

describe('HEAD /api/theme-fonts/[fontKey]/[file]', () => {
    afterEach(() => vi.unstubAllGlobals());

    it('sends HEAD upstream and answers like GET without a body', async () => {
        const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
        vi.stubGlobal('fetch', fetchMock);

        const response = await HEAD(request('dino-serif', '3.woff2', {}, 'HEAD'), {
            params: Promise.resolve({ fontKey: 'dino-serif', file: '3.woff2' }),
        });

        expect(response.status).toBe(200);
        expect(response.headers.get('content-type')).toBe('font/woff2');
        expect(response.headers.get('cache-control')).toBe('public, max-age=31536000, s-maxage=31536000, immutable');
        expect(response.body).toBeNull();
        expect(fetchMock.mock.calls[0][1].method).toBe('HEAD');
    });

    it('404s a malformed file name without calling the backend', async () => {
        const fetchMock = vi.fn();
        vi.stubGlobal('fetch', fetchMock);

        const response = await HEAD(request('dino-serif', '03.woff2', {}, 'HEAD'), {
            params: Promise.resolve({ fontKey: 'dino-serif', file: '03.woff2' }),
        });

        expect(response.status).toBe(404);
        expect(fetchMock).not.toHaveBeenCalled();
    });
});
