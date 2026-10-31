import { NextRequest } from 'next/server';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { GET, HEAD } from './route';

const ID = '0d6f3c2a-8b1e-4f7a-9c3d-2e5b8a1f4c6d';

function request(templateId: string, version: string, headers: Record<string, string> = {}, method = 'GET') {
    return new NextRequest(`https://storywall.test/api/qr-card-artwork/${templateId}/${version}`, { headers, method });
}

function call(templateId: string, version: string, headers: Record<string, string> = {}) {
    return GET(request(templateId, version, headers), { params: Promise.resolve({ templateId, version }) });
}

function image(type = 'image/webp') {
    return new Response(new Uint8Array([82, 73, 70, 70]), { status: 200, headers: { 'Content-Type': type } });
}

describe('GET /api/qr-card-artwork/[templateId]/[version]', () => {
    afterEach(() => {
        vi.unstubAllGlobals();
        vi.unstubAllEnvs();
    });

    it('proxies the backend artwork with immutable caching and forwards the client address', async () => {
        vi.stubEnv('CLIENT_IP_FORWARDING_SECRET', 's3cret');
        const fetchMock = vi.fn().mockResolvedValue(image());
        vi.stubGlobal('fetch', fetchMock);

        const response = await call(ID, '3', { 'x-forwarded-for': '203.0.113.9' });

        expect(response.status).toBe(200);
        expect(response.headers.get('content-type')).toBe('image/webp');
        expect(response.headers.get('cache-control')).toBe('public, max-age=31536000, s-maxage=31536000, immutable');
        expect(response.headers.get('x-content-type-options')).toBe('nosniff');
        expect(new Uint8Array(await response.arrayBuffer())).toEqual(new Uint8Array([82, 73, 70, 70]));
        const [url, init] = fetchMock.mock.calls[0];
        expect(url).toMatch(new RegExp(`/api/qr-card-templates/${ID}/artwork/3$`));
        expect(init.method).toBe('GET');
        expect(init.redirect).toBe('error');
        expect(init.headers['X-Storywall-Client-Ip']).toBe('203.0.113.9');
        expect(init.headers['X-Storywall-Client-Ip-Secret']).toBe('s3cret');
    });

    it('keeps a PNG a PNG', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue(image('image/png')));
        expect((await call(ID, '1')).headers.get('content-type')).toBe('image/png');
    });

    it('404s a malformed id or version without calling the backend', async () => {
        const fetchMock = vi.fn();
        vi.stubGlobal('fetch', fetchMock);

        for (const [templateId, version] of [
            ['not-a-uuid', '1'],
            ['../etc', '1'],
            [ID.toUpperCase(), '1'],
            [ID, '0'],
            [ID, '03'],
            [ID, '1.png'],
        ]) {
            const response = await call(templateId, version);
            expect(response.status, `${templateId}/${version}`).toBe(404);
            expect(response.headers.get('cache-control')).toBe('no-store');
        }
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it('passes a backend 404 through, uncached', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 404 })));

        const response = await call(ID, '2');

        expect(response.status).toBe(404);
        expect(response.headers.get('cache-control')).toBe('no-store');
    });

    it.each([204, 206, 502, 503])('turns a backend %i into an uncached 502', async (status) => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status })));

        const response = await call(ID, '2');

        expect(response.status).toBe(502);
        expect(response.headers.get('cache-control')).toBe('no-store');
    });

    it('refuses anything but a PNG or WebP image', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue(image('text/html')));

        const response = await call(ID, '2');

        expect(response.status).toBe(502);
        expect(response.headers.get('cache-control')).toBe('no-store');
    });

    it('answers an uncached 502 when the backend body fails mid-read', async () => {
        const broken = new ReadableStream({
            start(controller) {
                controller.error(new Error('reset'));
            },
        });
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(broken, { status: 200, headers: { 'Content-Type': 'image/png' } })));

        const response = await call(ID, '2');

        expect(response.status).toBe(502);
        expect(response.headers.get('cache-control')).toBe('no-store');
    });

    it('answers an uncached 502 when the backend is unreachable', async () => {
        vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('fetch failed')));

        const response = await call(ID, '2');

        expect(response.status).toBe(502);
        expect(response.headers.get('cache-control')).toBe('no-store');
    });

    it('answers HEAD with the headers and no body', async () => {
        const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 200, headers: { 'Content-Type': 'image/png' } }));
        vi.stubGlobal('fetch', fetchMock);

        const response = await HEAD(request(ID, '2', {}, 'HEAD'), { params: Promise.resolve({ templateId: ID, version: '2' }) });

        expect(response.status).toBe(200);
        expect(response.headers.get('content-type')).toBe('image/png');
        expect(response.body).toBeNull();
        expect(fetchMock.mock.calls[0][1].method).toBe('HEAD');
    });
});
