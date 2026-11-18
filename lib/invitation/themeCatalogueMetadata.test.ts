import { createTranslator, type Messages } from 'next-intl';
import { describe, expect, it, vi } from 'vitest';

import el from '@/messages/el.json';
import en from '@/messages/en.json';

// The real copy, through next-intl's own formatter, so the ICU select in the theme title is checked too.
vi.mock('next-intl/server', () => ({
    getTranslations: async ({ locale, namespace }: { locale: 'el' | 'en'; namespace: string }) =>
        createTranslator({
            locale,
            messages: (locale === 'el' ? el : en) as Messages,
            namespace,
            onError: (error) => {
                throw error;
            },
        }),
}));

import type { InvitationThemePage } from '@/lib/invitation/themeCatalogue';
import {
    getThemeCatalogueMetadata,
    getThemePageMetadata,
    themeCatalogueStructuredData,
    themePageCopy,
    themePageStructuredData,
} from '@/lib/invitation/themeCatalogueMetadata';
import { OG_IMAGE_PATH, SITE_URL } from '@/lib/seo';

function theme(overrides: Partial<InvitationThemePage> = {}): InvitationThemePage {
    return {
        slug: 'olive',
        name: 'Olive',
        eventType: 'WEDDING',
        seoTitle: null,
        seoDescription: null,
        ogImageUrl: null,
        cardColor: null,
        photos: [],
        ...overrides,
    };
}

type OpenGraph = { url?: string; images?: { url: string; alt?: string }[] | string };

describe('getThemeCatalogueMetadata', () => {
    it('gives each language its own canonical and both hreflang URLs', async () => {
        const english = await getThemeCatalogueMetadata('en');
        const greek = await getThemeCatalogueMetadata('el');
        expect(english.title).toBe(en.SaveMyDateStorefront.catalogue.metaTitle);
        expect(greek.title).toBe(el.SaveMyDateStorefront.catalogue.metaTitle);
        expect(english.alternates?.canonical).toBe(`${SITE_URL}/invitations`);
        expect(greek.alternates?.canonical).toBe(`${SITE_URL}/el/prosklitiria`);
        expect(greek.alternates?.languages).toEqual({
            en: `${SITE_URL}/invitations`,
            el: `${SITE_URL}/el/prosklitiria`,
            'x-default': `${SITE_URL}/invitations`,
        });
        expect((greek.openGraph as OpenGraph).url).toBe(greek.alternates?.canonical);
    });
});

describe('themePageCopy', () => {
    it('names the theme and its event type', async () => {
        expect((await themePageCopy(theme(), 'en')).title).toBe('Olive: online wedding invitation | StoryWall');
        expect((await themePageCopy(theme({ eventType: 'BAPTISM' }), 'en')).title).toBe('Olive: online baptism invitation | StoryWall');
        expect((await themePageCopy(theme({ eventType: 'BIRTHDAY' }), 'en')).title).toBe('Olive: online invitation | StoryWall');
    });

    it('uses the admin title and description on the Greek page only', async () => {
        const withSeo = theme({ seoTitle: 'Τίτλος', seoDescription: 'Περιγραφή' });
        expect(await themePageCopy(withSeo, 'el')).toEqual({ title: 'Τίτλος', description: 'Περιγραφή' });
        expect((await themePageCopy(withSeo, 'en')).title).toBe('Olive: online wedding invitation | StoryWall');
    });
});

describe('getThemePageMetadata', () => {
    it('gives the page its own canonical and hreflang pair', async () => {
        const metadata = await getThemePageMetadata(theme(), 'el');
        expect(metadata.alternates?.canonical).toBe(`${SITE_URL}/el/prosklitiria/olive`);
        expect(metadata.alternates?.languages).toEqual({
            en: `${SITE_URL}/invitations/olive`,
            el: `${SITE_URL}/el/prosklitiria/olive`,
            'x-default': `${SITE_URL}/invitations/olive`,
        });
    });

    it("shares the theme's own image with alt text", async () => {
        const metadata = await getThemePageMetadata(theme({ photos: [{ url: 'https://cdn/1.jpg', alt: null }] }), 'en');
        expect((metadata.openGraph as OpenGraph).images).toEqual([{ url: 'https://cdn/1.jpg', alt: 'Olive invitation design' }]);
        expect((metadata.twitter as { images?: string[] }).images).toEqual(['https://cdn/1.jpg']);
    });

    it("falls back to the site's image when the theme has none", async () => {
        const images = (await getThemePageMetadata(theme(), 'en')).openGraph as OpenGraph;
        expect(JSON.stringify(images.images)).toContain(OG_IMAGE_PATH);
    });
});

describe('themeCatalogueStructuredData', () => {
    it('lists every theme page in order after the breadcrumb', async () => {
        const data = await themeCatalogueStructuredData([{ slug: 'olive', name: 'Olive', eventType: 'WEDDING', cardColor: null, cardThumbUrl: null }], 'el');
        const [breadcrumb, list] = data['@graph'] as Record<string, unknown>[];
        expect(breadcrumb['@type']).toBe('BreadcrumbList');
        expect(list).toMatchObject({
            '@type': 'ItemList',
            itemListElement: [{ '@type': 'ListItem', position: 1, url: `${SITE_URL}/el/prosklitiria/olive`, name: 'Olive' }],
        });
    });
});

describe('themePageStructuredData', () => {
    it('describes the theme as a product without a price, with its breadcrumb', async () => {
        const data = await themePageStructuredData(theme({ photos: [{ url: 'https://cdn/1.jpg', alt: null }] }), 'en');
        const [product, breadcrumb] = data['@graph'] as Record<string, unknown>[];
        expect(product).toMatchObject({
            '@type': 'Product',
            name: 'Olive',
            sku: 'olive',
            url: `${SITE_URL}/invitations/olive`,
            image: ['https://cdn/1.jpg'],
        });
        expect(product).not.toHaveProperty('offers');
        expect(breadcrumb).toMatchObject({
            '@type': 'BreadcrumbList',
            itemListElement: [
                { position: 1, item: SITE_URL },
                { position: 2, item: `${SITE_URL}/invitations` },
                { position: 3, name: 'Olive', item: `${SITE_URL}/invitations/olive` },
            ],
        });
    });
});
