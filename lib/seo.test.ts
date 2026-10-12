import { describe, expect, it } from 'vitest';

import { OCCASIONS } from '@/lib/occasions/occasions';
import { buildOccasionMetadata } from '@/lib/occasions/occasionSeo';
import { absoluteUrl, buildLandingMetadata, jsonLdHtml, landingLanguageAlternates, SITE_URL } from '@/lib/seo';

describe('absoluteUrl', () => {
    it('resolves paths against the site origin', () => {
        expect(absoluteUrl('/')).toBe(SITE_URL);
        expect(absoluteUrl('/el')).toBe(`${SITE_URL}/el`);
        expect(absoluteUrl('/opengraph-image')).toBe(`${SITE_URL}/opengraph-image`);
    });
});

describe('landingLanguageAlternates', () => {
    it('lists every locale once plus x-default on the default page', () => {
        expect(landingLanguageAlternates()).toEqual({
            en: SITE_URL,
            el: `${SITE_URL}/el`,
            'x-default': SITE_URL,
        });
    });
});

describe('buildLandingMetadata', () => {
    const copy = { title: 'T', description: 'D', siteName: 'StoryWall', imageAlt: 'A' };

    it('gives each locale a self-referential canonical', () => {
        expect(buildLandingMetadata('en', copy).alternates?.canonical).toBe(SITE_URL);
        expect(buildLandingMetadata('el', copy).alternates?.canonical).toBe(`${SITE_URL}/el`);
    });

    it('keeps the Open Graph url in step with the canonical', () => {
        const metadata = buildLandingMetadata('el', copy);
        const openGraph = metadata.openGraph as { url?: string; locale?: string; alternateLocale?: string[] };
        expect(openGraph.url).toBe(metadata.alternates?.canonical);
        expect(openGraph.locale).toBe('el_GR');
        expect(openGraph.alternateLocale).toEqual(['en_US']);
    });
});

describe('jsonLdHtml', () => {
    it('escapes < so copy cannot close the script tag', () => {
        expect(jsonLdHtml({ a: '</script>' })).toBe('{"a":"\\u003c/script>"}');
    });
});

describe('buildOccasionMetadata', () => {
    const wedding = OCCASIONS.find((occasion) => occasion.eventType === 'WEDDING')!;
    const copy = { title: 'T', description: 'D', siteName: 'StoryWall', imageAlt: 'A' };

    it('uses the occasion page as canonical and lists both languages', () => {
        const metadata = buildOccasionMetadata(wedding, 'el', copy);
        expect(metadata.alternates?.canonical).toBe(`${SITE_URL}/el/gamos`);
        expect(metadata.alternates?.languages).toEqual({
            en: `${SITE_URL}/weddings`,
            el: `${SITE_URL}/el/gamos`,
            'x-default': `${SITE_URL}/weddings`,
        });
        expect((metadata.openGraph as { url?: string }).url).toBe(`${SITE_URL}/el/gamos`);
        expect(metadata.robots).toEqual({ index: true, follow: true });
    });
});
