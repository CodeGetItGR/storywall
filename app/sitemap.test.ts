// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';

const serverPublicConfigGet = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api/serverFetch', () => ({ serverPublicConfigGet: (...args: unknown[]) => serverPublicConfigGet(...args) }));

import sitemap from '@/app/sitemap';
import { forBusinessLanguageAlternates, landingLanguageAlternates, qrWeddingLanguageAlternates, SITE_URL } from '@/lib/seo';

describe('sitemap', () => {
    afterEach(() => {
        vi.unstubAllEnvs();
        serverPublicConfigGet.mockReset();
    });

    // While the site builds, a second identical fetch waits for the first one's cache write.
    it('reads the config once', async () => {
        serverPublicConfigGet.mockResolvedValue({ eventTypes: [{ eventTypeKey: 'WEDDING', isEnabled: true }] });
        await sitemap();
        expect(serverPublicConfigGet).toHaveBeenCalledTimes(1);
    });

    it('lists the landing, wedding QR, partner and every enabled ready occasion page', async () => {
        serverPublicConfigGet.mockResolvedValue({ eventTypes: [{ eventTypeKey: 'WEDDING', isEnabled: true }] });
        const urls = (await sitemap()).map((entry) => entry.url);
        expect(urls).toEqual([
            SITE_URL,
            `${SITE_URL}/el`,
            `${SITE_URL}/wedding-qr-code`,
            `${SITE_URL}/el/qr-code-gamou`,
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

    it('lists only the landing and the launched occasion pages on the production site', async () => {
        vi.stubEnv('VERCEL_ENV', 'production');
        serverPublicConfigGet.mockResolvedValue({
            eventTypes: [
                { eventTypeKey: 'WEDDING', isEnabled: true },
                { eventTypeKey: 'BAPTISM', isEnabled: true },
            ],
        });
        const urls = (await sitemap()).map((entry) => entry.url);
        expect(urls).toEqual([SITE_URL, `${SITE_URL}/el`, `${SITE_URL}/weddings`, `${SITE_URL}/el/gamos`]);
    });

    it('gives the wedding QR pages their language alternates', async () => {
        serverPublicConfigGet.mockResolvedValue({ eventTypes: [{ eventTypeKey: 'WEDDING', isEnabled: true }] });
        const byUrl = new Map((await sitemap()).map((entry) => [entry.url, entry]));
        expect(byUrl.get(`${SITE_URL}/wedding-qr-code`)?.alternates?.languages).toEqual(qrWeddingLanguageAlternates());
        expect(byUrl.get(`${SITE_URL}/el/qr-code-gamou`)?.alternates?.languages).toEqual(qrWeddingLanguageAlternates());
    });

    it('leaves out the wedding QR pages while weddings are off', async () => {
        serverPublicConfigGet.mockResolvedValue({ eventTypes: [{ eventTypeKey: 'WEDDING', isEnabled: false }] });
        const urls = (await sitemap()).map((entry) => entry.url);
        expect(urls).not.toContain(`${SITE_URL}/wedding-qr-code`);
        expect(urls).not.toContain(`${SITE_URL}/el/qr-code-gamou`);
    });

    it('keeps every ready occasion when the config cannot be read', async () => {
        serverPublicConfigGet.mockRejectedValue(new Error('down'));
        const urls = (await sitemap()).map((entry) => entry.url);
        expect(urls).toContain(`${SITE_URL}/baptisms`);
        expect(urls).toContain(`${SITE_URL}/el/vaptisi`);
        expect(urls).toContain(`${SITE_URL}/el/qr-code-gamou`);
    });
});
