import { describe, expect, it } from 'vitest';

import {
    absoluteUrl,
    buildForBusinessMetadata,
    buildLandingMetadata,
    forBusinessLanguageAlternates,
    landingLanguageAlternates,
    SITE_URL,
} from '@/lib/seo';

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

describe('forBusinessLanguageAlternates', () => {
    it('lists both partner URLs plus x-default on English', () => {
        expect(forBusinessLanguageAlternates()).toEqual({
            en: `${SITE_URL}/for-business`,
            el: `${SITE_URL}/el/epaggelmaties`,
            'x-default': `${SITE_URL}/for-business`,
        });
    });
});

describe('buildForBusinessMetadata', () => {
    const copy = { title: 'T', description: 'D', siteName: 'StoryWall', imageAlt: 'A' };

    it('gives each locale its own canonical and the shared alternates', () => {
        const el = buildForBusinessMetadata('el', copy);
        expect(el.alternates?.canonical).toBe(`${SITE_URL}/el/epaggelmaties`);
        expect(el.alternates?.languages).toEqual(forBusinessLanguageAlternates());
        expect(buildForBusinessMetadata('en', copy).alternates?.canonical).toBe(`${SITE_URL}/for-business`);
    });

    it('is indexable and keeps the Open Graph url on the canonical', () => {
        const metadata = buildForBusinessMetadata('en', copy);
        const openGraph = metadata.openGraph as { url?: string };
        expect(metadata.robots).toEqual({ index: true, follow: true });
        expect(openGraph.url).toBe(metadata.alternates?.canonical);
    });

    // The route's opengraph-image file sits in a route group, so Next serves it
    // under a hashed URL and adds the tag itself. A hand-built URL would 404.
    it('leaves the image to the route opengraph-image file', () => {
        const metadata = buildForBusinessMetadata('en', copy);
        expect((metadata.openGraph as { images?: unknown }).images).toBeUndefined();
        expect((metadata.twitter as { images?: unknown }).images).toBeUndefined();
    });
});
