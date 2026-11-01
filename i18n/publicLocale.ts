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
        ) ?? null
    );
}

// The same public page in another language; null when the page has no twin.
export function publicTwinPath(pathname: string | null, target: Locale): string | null {
    if (isPublicLandingPath(pathname)) return getPublicLandingPath(target);
    if (isForBusinessPath(pathname)) return getForBusinessPath(target);
    const legalPage = pathname ? legalPageForPath(pathname) : null;
    if (legalPage) return getLegalPagePath(legalPage.path, target);
    return null;
}
