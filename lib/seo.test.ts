import { describe, expect, it, vi } from 'vitest';

import { OCCASIONS } from '@/lib/occasions/occasions';
import { buildOccasionMetadata } from '@/lib/occasions/occasionSeo';
import {
    absoluteUrl,
    buildForBusinessMetadata,
    buildLandingMetadata,
    buildQrWeddingMetadata,
    forBusinessLanguageAlternates,
    jsonLdHtml,
    landingLanguageAlternates,
    qrWeddingLanguageAlternates,
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

describe('qrWeddingLanguageAlternates', () => {
    it('lists both wedding QR URLs and sends x-default to the English one', () => {
        expect(qrWeddingLanguageAlternates()).toEqual({
            en: `${SITE_URL}/wedding-qr-code`,
            el: `${SITE_URL}/el/qr-code-gamou`,
            'x-default': `${SITE_URL}/wedding-qr-code`,
        });
    });
});

describe('buildQrWeddingMetadata', () => {
    const copy = { title: 'T', description: 'D', siteName: 'StoryWall', imageAlt: 'A', keywords: ['QR γάμου'] };

    it('gives each locale its own canonical and the shared alternates', () => {
        const el = buildQrWeddingMetadata('el', copy);
        expect(el.alternates?.canonical).toBe(`${SITE_URL}/el/qr-code-gamou`);
        expect(el.alternates?.languages).toEqual(qrWeddingLanguageAlternates());
        expect(buildQrWeddingMetadata('en', copy).alternates?.canonical).toBe(`${SITE_URL}/wedding-qr-code`);
    });

    it('is indexable, keeps its keywords and uses the default share image', () => {
        const metadata = buildQrWeddingMetadata('el', copy);
        const openGraph = metadata.openGraph as { images?: { url: string }[] };
        expect(metadata.robots).toEqual({ index: true, follow: true });
        expect(metadata.keywords).toEqual(['QR γάμου']);
        expect(openGraph.images?.[0]?.url).toBe(`${SITE_URL}/opengraph-image`);
    });

    it('is never indexed on staging', () => {
        vi.stubEnv('NEXT_PUBLIC_APP_ENV', 'staging');
        try {
            expect(buildQrWeddingMetadata('el', copy).robots).toEqual({ index: false, follow: false });
        } finally {
            vi.unstubAllEnvs();
        }
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
