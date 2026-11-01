// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';

const serverPublicConfigGet = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api/serverFetch', () => ({ serverPublicConfigGet: (...args: unknown[]) => serverPublicConfigGet(...args) }));

import sitemap from '@/app/sitemap';
import {
    forBusinessLanguageAlternates,
    landingLanguageAlternates,
    legalPageLanguageAlternates,
    qrWeddingLanguageAlternates,
    SITE_URL,
} from '@/lib/seo';

const LEGAL_URLS = [
    `${SITE_URL}/contact`,
    `${SITE_URL}/el/contact`,
    `${SITE_URL}/legal/terms`,
    `${SITE_URL}/el/legal/terms`,
    `${SITE_URL}/legal/privacy`,
    `${SITE_URL}/el/legal/privacy`,
    `${SITE_URL}/legal/cookies`,
    `${SITE_URL}/el/legal/cookies`,
    `${SITE_URL}/legal/withdrawal-terms`,
    `${SITE_URL}/el/legal/withdrawal-terms`,
    `${SITE_URL}/legal/community-guidelines`,
    `${SITE_URL}/el/legal/community-guidelines`,
];

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

    it('lists the landing, wedding QR, partner, every enabled ready occasion page and the legal pages', async () => {
        serverPublicConfigGet.mockResolvedValue({ eventTypes: [{ eventTypeKey: 'WEDDING', isEnabled: true }] });
        const urls = (await sitemap()).map((entry) => entry.url);
        expect(urls).toEqual([
            SITE_URL,
            `${SITE_URL}/el`,
            `${SITE_URL}/qr-code-for-wedding-photos`,
            `${SITE_URL}/el/qr-code-gamou`,
            `${SITE_URL}/for-business`,
            `${SITE_URL}/el/epaggelmaties`,
            `${SITE_URL}/weddings`,
            `${SITE_URL}/el/gamos`,
            ...LEGAL_URLS,
        ]);
    });

    it('gives the landing and partner pages their language alternates', async () => {
        serverPublicConfigGet.mockResolvedValue({ eventTypes: [] });
        const byUrl = new Map((await sitemap()).map((entry) => [entry.url, entry]));
        expect(byUrl.get(`${SITE_URL}/el`)?.alternates?.languages).toEqual(landingLanguageAlternates());
        expect(byUrl.get(`${SITE_URL}/el/epaggelmaties`)?.alternates?.languages).toEqual(forBusinessLanguageAlternates());
    });

    it('lists only the landing, the launched occasion pages and the legal pages on the production site', async () => {
        vi.stubEnv('VERCEL_ENV', 'production');
        serverPublicConfigGet.mockResolvedValue({
            eventTypes: [
                { eventTypeKey: 'WEDDING', isEnabled: true },
                { eventTypeKey: 'BAPTISM', isEnabled: true },
            ],
        });
        const urls = (await sitemap()).map((entry) => entry.url);
        expect(urls).toEqual([SITE_URL, `${SITE_URL}/el`, `${SITE_URL}/weddings`, `${SITE_URL}/el/gamos`, ...LEGAL_URLS]);
    });

    it('gives each legal page both language URLs', async () => {
        serverPublicConfigGet.mockResolvedValue({ eventTypes: [] });
        const byUrl = new Map((await sitemap()).map((entry) => [entry.url, entry]));
        expect(byUrl.get(`${SITE_URL}/el/legal/privacy`)?.alternates?.languages).toEqual(legalPageLanguageAlternates('/legal/privacy'));
        expect(legalPageLanguageAlternates('/legal/privacy')).toEqual({
            en: `${SITE_URL}/legal/privacy`,
            el: `${SITE_URL}/el/legal/privacy`,
            'x-default': `${SITE_URL}/legal/privacy`,
        });
    });

    it('gives the wedding QR pages their language alternates', async () => {
        serverPublicConfigGet.mockResolvedValue({ eventTypes: [{ eventTypeKey: 'WEDDING', isEnabled: true }] });
        const byUrl = new Map((await sitemap()).map((entry) => [entry.url, entry]));
        expect(byUrl.get(`${SITE_URL}/qr-code-for-wedding-photos`)?.alternates?.languages).toEqual(qrWeddingLanguageAlternates());
        expect(byUrl.get(`${SITE_URL}/el/qr-code-gamou`)?.alternates?.languages).toEqual(qrWeddingLanguageAlternates());
    });

    it('leaves out the wedding QR pages while weddings are off', async () => {
        serverPublicConfigGet.mockResolvedValue({ eventTypes: [{ eventTypeKey: 'WEDDING', isEnabled: false }] });
        const urls = (await sitemap()).map((entry) => entry.url);
        expect(urls).not.toContain(`${SITE_URL}/qr-code-for-wedding-photos`);
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
