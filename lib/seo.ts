import type { Metadata } from 'next';

import { defaultLocale, type Locale, locales } from '@/i18n/config';
import { getPublicLandingPath } from '@/i18n/publicLocale';

// Single source for the production origin. Canonicals, alternates, the
// sitemap and structured data all build absolute URLs from it, so it must
// stay one value rather than being read from process.env in each place.
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.storywall.gr').replace(/\/$/, '');

export const OG_IMAGE_PATH = '/opengraph-image';
export const OG_IMAGE_SIZE = { width: 1200, height: 630 } as const;

// The root resolves to the bare origin so it matches the canonical Next emits
// (no trailing slash) and the sitemap lists byte-identical URLs.
export function absoluteUrl(path: string): string {
    return path === '/' ? SITE_URL : new URL(path, `${SITE_URL}/`).toString();
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

type LandingMetadataCopy = {
    title: string;
    description: string;
    siteName: string;
    imageAlt: string;
};

export function buildLandingMetadata(locale: Locale, copy: LandingMetadataCopy): Metadata {
    const canonical = absoluteUrl(getPublicLandingPath(locale));
    const image = { url: absoluteUrl(OG_IMAGE_PATH), ...OG_IMAGE_SIZE, alt: copy.imageAlt };

    return {
        metadataBase: new URL(SITE_URL),
        title: copy.title,
        description: copy.description,
        alternates: {
            canonical,
            languages: landingLanguageAlternates(),
        },
        openGraph: {
            type: 'website',
            url: canonical,
            siteName: copy.siteName,
            title: copy.title,
            description: copy.description,
            locale: ogLocale(locale),
            alternateLocale: locales.filter((other) => other !== locale).map(ogLocale),
            images: [image],
        },
        twitter: {
            card: 'summary_large_image',
            title: copy.title,
            description: copy.description,
            images: [image],
        },
        robots: { index: true, follow: true },
    };
}
