import { describe, expect, it } from 'vitest';

import { forBusinessLanguageAlternates, landingLanguageAlternates, SITE_URL } from '@/lib/seo';

import sitemap from './sitemap';

describe('sitemap', () => {
    it('lists the landing and partner pages with their alternates', () => {
        const entries = sitemap();
        const byUrl = new Map(entries.map((entry) => [entry.url, entry]));

        expect(byUrl.get(SITE_URL)?.alternates?.languages).toEqual(landingLanguageAlternates());
        expect(byUrl.get(`${SITE_URL}/el`)?.alternates?.languages).toEqual(landingLanguageAlternates());
        expect(byUrl.get(`${SITE_URL}/for-business`)?.alternates?.languages).toEqual(forBusinessLanguageAlternates());
        expect(byUrl.get(`${SITE_URL}/el/epaggelmaties`)?.alternates?.languages).toEqual(forBusinessLanguageAlternates());
        expect(entries).toHaveLength(4);
    });
});
