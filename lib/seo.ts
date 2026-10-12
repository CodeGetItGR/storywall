import type { Metadata } from 'next';

import { defaultLocale, type Locale, locales } from '@/i18n/config';
import { getPublicLandingPath } from '@/i18n/publicLocale';

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

export function ogLocale(locale: Locale): string {
    return locale === 'el' ? 'el_GR' : 'en_US';
}

export type PageMetadataCopy = {
    title: string;
    description: string;
    siteName: string;
    imageAlt: string;
};

export function buildIndexableMetadata(
    locale: Locale,
    canonicalPath: string,
    languages: Record<string, string>,
    imagePath: string,
    copy: PageMetadataCopy,
): Metadata {
    const canonical = absoluteUrl(canonicalPath);
    const images = [{ url: absoluteUrl(imagePath), ...OG_IMAGE_SIZE, alt: copy.imageAlt }];

    return {
        metadataBase: new URL(SITE_URL),
        title: copy.title,
        description: copy.description,
        alternates: { canonical, languages },
        openGraph: {
            type: 'website',
            url: canonical,
            siteName: copy.siteName,
            title: copy.title,
            description: copy.description,
            locale: ogLocale(locale),
            alternateLocale: locales.filter((other) => other !== locale).map(ogLocale),
            images,
        },
        twitter: {
            card: 'summary_large_image',
            title: copy.title,
            description: copy.description,
            images,
        },
        robots: { index: true, follow: true },
    };
}

export function buildLandingMetadata(locale: Locale, copy: PageMetadataCopy): Metadata {
    return buildIndexableMetadata(locale, getPublicLandingPath(locale), landingLanguageAlternates(), OG_IMAGE_PATH, copy);
}

// JSON-LD for a <script> tag: `<` is escaped so a `</script>` in copy can't close it.
export function jsonLdHtml(data: unknown): string {
    return JSON.stringify(data).replace(/</g, '\\u003c');
}
