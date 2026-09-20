import { defaultLocale, type Locale, locales } from '@/i18n/config';

export function getPublicLandingPath(locale: Locale): string {
    return locale === defaultLocale ? '/' : `/${locale}`;
}

export function isPublicLandingPath(pathname: string | null): boolean {
    return pathname === '/' || locales.some((locale) => locale !== defaultLocale && pathname === `/${locale}`);
}
