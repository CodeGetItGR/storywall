// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';

const serverPublicConfigGet = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api/serverFetch', () => ({ serverPublicConfigGet: (...args: unknown[]) => serverPublicConfigGet(...args) }));

import sitemap from '@/app/sitemap';
import { SITE_URL } from '@/lib/seo';

describe('sitemap', () => {
    it('lists the landing pages and every enabled ready occasion with its alternates', async () => {
        serverPublicConfigGet.mockResolvedValue({ eventTypes: [{ eventTypeKey: 'WEDDING', isEnabled: true }] });
        const urls = (await sitemap()).map((entry) => entry.url);
        expect(urls).toEqual([SITE_URL, `${SITE_URL}/el`, `${SITE_URL}/weddings`, `${SITE_URL}/el/gamos`]);
    });

    it('keeps every ready occasion when the config cannot be read', async () => {
        serverPublicConfigGet.mockRejectedValue(new Error('down'));
        const urls = (await sitemap()).map((entry) => entry.url);
        expect(urls).toContain(`${SITE_URL}/baptisms`);
        expect(urls).toContain(`${SITE_URL}/el/vaptisi`);
    });
});
