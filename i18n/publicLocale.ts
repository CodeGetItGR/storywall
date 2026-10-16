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

// The language a public page is written in, read from its URL alone so
// crawlers get the same language as visitors. Null for every other path.
export function publicPageLocale(pathname: string): Locale | null {
    return locales.find((locale) => pathname === getPublicLandingPath(locale) || pathname === FOR_BUSINESS_PATHS[locale]) ?? null;
}

// The same public page in another language; null when the page has no twin.
export function publicTwinPath(pathname: string | null, target: Locale): string | null {
    if (isPublicLandingPath(pathname)) return getPublicLandingPath(target);
    if (isForBusinessPath(pathname)) return getForBusinessPath(target);
    return null;
}
