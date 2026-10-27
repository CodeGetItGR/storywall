import { afterEach, describe, expect, it, vi } from 'vitest';

describe('fetchLiveSiteNotices', () => {
    afterEach(() => {
        vi.unstubAllGlobals();
        vi.resetModules();
    });

    const notice = { id: 'n1', version: 1, tone: 'INFO', message: { en: 'a', el: 'b' }, linkUrl: null, linkLabel: {}, areas: ['EVERYWHERE'], dismissible: true, startsAt: null, createdAt: '2026-10-01T00:00:00Z' };

    it('returns the live list and keeps it as the last good copy', async () => {
        const { fetchLiveSiteNotices } = await import('@/lib/siteNotices.server');
        vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(new Response(JSON.stringify([notice]), { status: 200 })));
        expect(await fetchLiveSiteNotices()).toEqual([notice]);

        vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(new Response(null, { status: 503 })));
        expect(await fetchLiveSiteNotices()).toEqual([notice]);

        vi.stubGlobal('fetch', vi.fn().mockRejectedValueOnce(new TypeError('fetch failed')));
        expect(await fetchLiveSiteNotices()).toEqual([notice]);
    });

    it('returns an empty list when Spring has never answered or answers with junk', async () => {
        const { fetchLiveSiteNotices } = await import('@/lib/siteNotices.server');
        vi.stubGlobal('fetch', vi.fn().mockRejectedValueOnce(new TypeError('fetch failed')));
        expect(await fetchLiveSiteNotices()).toEqual([]);
        vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(new Response('{"oops":true}', { status: 200 })));
        expect(await fetchLiveSiteNotices()).toEqual([]);
    });
});
