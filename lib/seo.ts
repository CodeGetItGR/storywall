import type { Metadata } from 'next';

import { defaultLocale, type Locale, locales } from '@/i18n/config';
import { getForBusinessPath, getPublicLandingPath, getQrWeddingPath, getVendorPagePath, localizeLegalHref, type VendorPageType } from '@/i18n/publicLocale';

// Single source for the production origin. Canonicals, alternates, the
// sitemap and structured data all build absolute URLs from it, so it must
// stay one value rather than being read from process.env in each place.
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.storywall.gr').replace(/\/$/, '');

export const OG_IMAGE_PATH = '/opengraph-image';
export const OG_IMAGE_SIZE = { width: 1200, height: 630 } as const;

// Official StoryWall profiles: linked from the landing footer and listed as the
// Organization's `sameAs` so search engines tie them to the site.
export const SOCIAL_PROFILES = [
    { key: 'instagram', href: 'https://www.instagram.com/storywall.gr/' },
    { key: 'tiktok', href: 'https://www.tiktok.com/@storywall.gr' },
    { key: 'facebook', href: 'https://www.facebook.com/storywall.gr' },
] as const;

// The root resolves to the bare origin so it matches the canonical Next emits
// (no trailing slash) and the sitemap lists byte-identical URLs.
export function absoluteUrl(path: string): string {
    return path === '/' ? SITE_URL : new URL(path, `${SITE_URL}/`).toString();
}

// Account, email-link and other utility pages work for visitors but have
// nothing worth finding in search.
export const NO_INDEX: Metadata['robots'] = { index: false, follow: true };

// Staging serves the same pages under another host and must never be indexed. app/robots.ts
// blocks it too; this tag covers a page a crawler reaches anyway.
export const STAGING_NO_INDEX: Metadata['robots'] = { index: false, follow: false };

export function isStagingSite(): boolean {
    return process.env.NEXT_PUBLIC_APP_ENV === 'staging';
}

// The page's own URL, so a `?version=` copy of a legal page counts as the page itself.
export function canonicalAlternates(path: string): Metadata['alternates'] {
    return { canonical: absoluteUrl(path) };
}

// Each locale is its own canonical page: `/` for the default locale and
// `/<locale>` for the rest. x-default points at the default page so a
// crawler with no language preference lands where an unknown visitor would.
export function landingLanguageAlternates(): Record<string, string> {
    const languages: Record<string, string> = {};
    for (const locale of locales) languages[locale] = absoluteUrl(getPublicLandingPath(locale));
    languages['x-default'] = absoluteUrl(getPublicLandingPath(defaultLocale));
    return languages;
}

// Same shape as the landing's: every partner URL plus x-default on the default locale.
export function forBusinessLanguageAlternates(): Record<string, string> {
    const languages: Record<string, string> = {};
    for (const locale of locales) languages[locale] = absoluteUrl(getForBusinessPath(locale));
    languages['x-default'] = absoluteUrl(getForBusinessPath(defaultLocale));
    return languages;
}

// Same shape for one vendor type's page.
export function vendorPageLanguageAlternates(type: VendorPageType): Record<string, string> {
    const languages: Record<string, string> = {};
    for (const locale of locales) languages[locale] = absoluteUrl(getVendorPagePath(type, locale));
    languages['x-default'] = absoluteUrl(getVendorPagePath(type, defaultLocale));
    return languages;
}

// Same shape again for the wedding QR page.
export function qrWeddingLanguageAlternates(): Record<string, string> {
    const languages: Record<string, string> = {};
    for (const locale of locales) languages[locale] = absoluteUrl(getQrWeddingPath(locale));
    languages['x-default'] = absoluteUrl(getQrWeddingPath(defaultLocale));
    return languages;
}

// And for a contact or legal page, given its English path.
export function legalPageLanguageAlternates(path: string): Record<string, string> {
    const languages: Record<string, string> = {};
    for (const locale of locales) languages[locale] = absoluteUrl(localizeLegalHref(path, locale));
    languages['x-default'] = absoluteUrl(path);
    return languages;
}

export function ogLocale(locale: Locale): string {
    return locale === 'el' ? 'el_GR' : 'en_US';
}

export type PageMetadataCopy = {
    title: string;
    description: string;
    siteName: string;
    imageAlt: string;
    // The searches a page is written for (occasion pages).
    keywords?: string[];
};

type IndexableMetadataInput = {
    locale: Locale;
    path: string;
    languages: Record<string, string>;
    // Left out when the route has its own opengraph-image file: Next adds that
    // one itself, under a URL only it knows (route groups get a hash suffix).
    imagePath?: string;
    copy: PageMetadataCopy;
};

// An indexable public page with a self-referential canonical and its language twins.
export function buildIndexableMetadata({ locale, path, languages, imagePath, copy }: IndexableMetadataInput): Metadata {
    const canonical = absoluteUrl(path);
    const images = imagePath ? [{ url: absoluteUrl(imagePath), ...OG_IMAGE_SIZE, alt: copy.imageAlt }] : undefined;

    return {
        metadataBase: new URL(SITE_URL),
        title: copy.title,
        description: copy.description,
        ...(copy.keywords && { keywords: copy.keywords }),
        alternates: { canonical, languages },
        openGraph: {
            type: 'website',
            url: canonical,
            siteName: copy.siteName,
            title: copy.title,
            description: copy.description,
            locale: ogLocale(locale),
            alternateLocale: locales.filter((other) => other !== locale).map(ogLocale),
            ...(images && { images }),
        },
        twitter: {
            card: 'summary_large_image',
            title: copy.title,
            description: copy.description,
            ...(images && { images }),
        },
        robots: isStagingSite() ? STAGING_NO_INDEX : { index: true, follow: true },
    };
}

export function buildLandingMetadata(locale: Locale, copy: PageMetadataCopy): Metadata {
    return buildIndexableMetadata({
        locale,
        path: getPublicLandingPath(locale),
        languages: landingLanguageAlternates(),
        imagePath: OG_IMAGE_PATH,
        copy,
    });
}

// The partner page's OG image is the opengraph-image.tsx in its own route folder.
export function buildForBusinessMetadata(locale: Locale, copy: PageMetadataCopy): Metadata {
    return buildIndexableMetadata({
        locale,
        path: getForBusinessPath(locale),
        languages: forBusinessLanguageAlternates(),
        copy,
    });
}

// A vendor type's OG image is the opengraph-image.tsx in its own route folder.
export function buildVendorPageMetadata(type: VendorPageType, locale: Locale, copy: PageMetadataCopy): Metadata {
    return buildIndexableMetadata({
        locale,
        path: getVendorPagePath(type, locale),
        languages: vendorPageLanguageAlternates(type),
        copy,
    });
}

// The wedding QR page's OG image is its route's own opengraph-image.
export function buildQrWeddingMetadata(locale: Locale, copy: PageMetadataCopy): Metadata {
    return buildIndexableMetadata({
        locale,
        path: getQrWeddingPath(locale),
        languages: qrWeddingLanguageAlternates(),
        copy,
    });
}

// A contact or legal page in the request's language, given its English path. It shares the
// landing's OG image.
export function buildLegalPageMetadata(locale: Locale, path: string, copy: PageMetadataCopy): Metadata {
    return buildIndexableMetadata({
        locale,
        path: localizeLegalHref(path, locale),
        languages: legalPageLanguageAlternates(path),
        imagePath: OG_IMAGE_PATH,
        copy,
    });
}

// JSON-LD for a <script> tag: `<` is escaped so a `</script>` in copy can't close it.
export function jsonLdHtml(data: unknown): string {
    return JSON.stringify(data).replace(/</g, '\\u003c');
}
