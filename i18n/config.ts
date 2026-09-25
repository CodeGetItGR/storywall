export const locales = ['en', 'el'] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = 'en';
export const localeCookieName = 'NEXT_LOCALE';
export const localeCookieMaxAge = 60 * 60 * 24 * 365;
