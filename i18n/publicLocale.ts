import { defaultLocale, type Locale, locales } from '@/i18n/config';

export function getPublicLandingPath(locale: Locale): string {
    return locale === defaultLocale ? '/' : `/${locale}`;
}

export function isPublicLandingPath(pathname: string | null): boolean {
    return pathname === '/' || locales.some((locale) => locale !== defaultLocale && pathname === `/${locale}`);
}

// The partner page for businesses. Each slug is in its page's language and
// never changes once live (docs/seo-guidelines.md).
const FOR_BUSINESS_PATHS: Record<Locale, string> = {
    en: '/for-business',
    el: '/el/epaggelmaties',
};

export function getForBusinessPath(locale: Locale): string {
    return FOR_BUSINESS_PATHS[locale];
}

export function isForBusinessPath(pathname: string | null): boolean {
    return locales.some((locale) => FOR_BUSINESS_PATHS[locale] === pathname);
}

// The partner page's one page per vendor type, under the partner page's path. Each slug holds the search
// the page is written for, in its page's language, and never changes once live.
export const VENDOR_PAGE_SLUGS = {
    PLANNER: { en: 'wedding-planners', el: 'wedding-planners' },
    VENUE: { en: 'wedding-venues', el: 'xoroi-dexioseon' },
    PHOTOGRAPHER: { en: 'wedding-photographers', el: 'fotografoi-gamou' },
    VIDEOGRAPHER: { en: 'wedding-videographers', el: 'vinteografoi-gamou' },
    DECORATION: { en: 'wedding-decorators', el: 'stolismos-gamou' },
    CATERING: { en: 'wedding-caterers', el: 'catering-gamou' },
    MUSIC: { en: 'wedding-djs', el: 'dj-gamou' },
} as const satisfies Record<string, Record<Locale, string>>;

export type VendorPageType = keyof typeof VENDOR_PAGE_SLUGS;

// The order the landing and the pages list them in: the partner application's.
export const VENDOR_PAGE_TYPES: readonly VendorPageType[] = ['PLANNER', 'VENUE', 'PHOTOGRAPHER', 'VIDEOGRAPHER', 'DECORATION', 'CATERING', 'MUSIC'];

export function getVendorPagePath(type: VendorPageType, locale: Locale): string {
    return `${FOR_BUSINESS_PATHS[locale]}/${VENDOR_PAGE_SLUGS[type][locale]}`;
}

// The vendor type a page slug names in the given language; null for any other slug.
export function vendorPageTypeForSlug(slug: string, locale: Locale): VendorPageType | null {
    return VENDOR_PAGE_TYPES.find((type) => VENDOR_PAGE_SLUGS[type][locale] === slug) ?? null;
}

// The vendor page a URL shows, and in which language. Null for every other path.
export function vendorPageForPath(pathname: string | null): { type: VendorPageType; locale: Locale } | null {
    for (const locale of locales) {
        const type = VENDOR_PAGE_TYPES.find((candidate) => getVendorPagePath(candidate, locale) === pathname);
        if (type) return { type, locale };
    }
    return null;
}

// The wedding QR page, one URL per language. Same rules as the partner page's slugs.
export const QR_WEDDING_PATHS: Record<Locale, string> = {
    en: '/qr-code-for-wedding-photos',
    el: '/el/qr-code-gamou',
};

export function getQrWeddingPath(locale: Locale): string {
    return QR_WEDDING_PATHS[locale];
}

export function isQrWeddingPath(pathname: string | null): boolean {
    return locales.some((locale) => QR_WEDDING_PATHS[locale] === pathname);
}

// The contact and legal pages: the English path, and the same path under /el for Greek.
// Each page lives once at its English path; proxy.ts renders the Greek URL from it in Greek.
export const LEGAL_PAGE_PATHS = [
    '/contact',
    '/legal/terms',
    '/legal/privacy',
    '/legal/cookies',
    '/legal/withdrawal-terms',
    '/legal/community-guidelines',
] as const;

export type LegalPagePath = (typeof LEGAL_PAGE_PATHS)[number];

export function getLegalPagePath(path: LegalPagePath, locale: Locale): string {
    return locale === defaultLocale ? path : `/${locale}${path}`;
}

// The legal page a URL shows, and in which language. Null for every other path.
export function legalPageForPath(pathname: string): { path: LegalPagePath; locale: Locale } | null {
    for (const locale of locales) {
        const path = LEGAL_PAGE_PATHS.find((candidate) => getLegalPagePath(candidate, locale) === pathname);
        if (path) return { path, locale };
    }
    return null;
}

// A site link in the given language: a contact or legal page link moves to that language's URL,
// keeping its query and hash. Every other link comes back unchanged.
export function localizeLegalHref(href: string, locale: Locale): string {
    const pathEnd = href.search(/[?#]/);
    const path = pathEnd === -1 ? href : href.slice(0, pathEnd);
    const legalPath = LEGAL_PAGE_PATHS.find((candidate) => candidate === path);
    return legalPath ? `${getLegalPagePath(legalPath, locale)}${href.slice(path.length)}` : href;
}

// The language a public page is written in, read from its URL alone so
// crawlers get the same language as visitors. Null for every other path.
export function publicPageLocale(pathname: string): Locale | null {
    return (
        locales.find(
            (locale) => pathname === getPublicLandingPath(locale) || pathname === FOR_BUSINESS_PATHS[locale] || pathname === QR_WEDDING_PATHS[locale],
        ) ??
        vendorPageForPath(pathname)?.locale ??
        null
    );
}

// The same public page in another language; null when the page has no twin.
export function publicTwinPath(pathname: string | null, target: Locale): string | null {
    if (isPublicLandingPath(pathname)) return getPublicLandingPath(target);
    if (isForBusinessPath(pathname)) return getForBusinessPath(target);
    const vendorPage = vendorPageForPath(pathname);
    if (vendorPage) return getVendorPagePath(vendorPage.type, target);
    const legalPage = pathname ? legalPageForPath(pathname) : null;
    if (legalPage) return getLegalPagePath(legalPage.path, target);
    return null;
}
