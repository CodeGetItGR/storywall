// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';

const serverPublicConfigGet = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api/serverFetch', () => ({ serverPublicConfigGet: (...args: unknown[]) => serverPublicConfigGet(...args) }));

import sitemap from '@/app/sitemap';
import { forBusinessLanguageAlternates, landingLanguageAlternates, SITE_URL } from '@/lib/seo';

describe('sitemap', () => {
    afterEach(() => {
        vi.unstubAllEnvs();
    });

    it('lists the landing, partner and every enabled ready occasion page', async () => {
        serverPublicConfigGet.mockResolvedValue({ eventTypes: [{ eventTypeKey: 'WEDDING', isEnabled: true }] });
        const urls = (await sitemap()).map((entry) => entry.url);
        expect(urls).toEqual([
            SITE_URL,
            `${SITE_URL}/el`,
            `${SITE_URL}/for-business`,
            `${SITE_URL}/el/epaggelmaties`,
            `${SITE_URL}/weddings`,
            `${SITE_URL}/el/gamos`,
        ]);
    });

    it('gives the landing and partner pages their language alternates', async () => {
        serverPublicConfigGet.mockResolvedValue({ eventTypes: [] });
        const byUrl = new Map((await sitemap()).map((entry) => [entry.url, entry]));
        expect(byUrl.get(`${SITE_URL}/el`)?.alternates?.languages).toEqual(landingLanguageAlternates());
        expect(byUrl.get(`${SITE_URL}/el/epaggelmaties`)?.alternates?.languages).toEqual(forBusinessLanguageAlternates());
    });

    it('lists only the landing on the production site before launch', async () => {
        vi.stubEnv('VERCEL_ENV', 'production');
        serverPublicConfigGet.mockResolvedValue({ eventTypes: [{ eventTypeKey: 'WEDDING', isEnabled: true }] });
        const urls = (await sitemap()).map((entry) => entry.url);
        expect(urls).toEqual([SITE_URL, `${SITE_URL}/el`]);
    });

    it('keeps every ready occasion when the config cannot be read', async () => {
        serverPublicConfigGet.mockRejectedValue(new Error('down'));
        const urls = (await sitemap()).map((entry) => entry.url);
        expect(urls).toContain(`${SITE_URL}/baptisms`);
        expect(urls).toContain(`${SITE_URL}/el/vaptisi`);
    });
});
