import { type Locale, locales } from '@/i18n/config';

// Links hosts hand out to guests. They open without an account, and their
// link previews are built from the page itself.
export const SHARED_LINK_PREFIXES = ['/invite/', '/q/'] as const;

// Carries the sharer's language so the link preview and the page open in it.
export const SHARE_LOCALE_PARAM = 'lang';

export function isSharedLinkPath(pathname: string): boolean {
    return SHARED_LINK_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

export function withShareLocale(url: string, locale: string): string {
    if (!url || !readShareLocale(locale)) return url;
    try {
        const shareUrl = new URL(url);
        shareUrl.searchParams.set(SHARE_LOCALE_PARAM, locale);
        return shareUrl.toString();
    } catch {
        return url;
    }
}

export function readShareLocale(value: string | null): Locale | null {
    return value && (locales as readonly string[]).includes(value) ? (value as Locale) : null;
}

// The address after a language switch on a shared link that names its language:
// the same URL with the new `lang`, so a reload or a copied link keeps the choice.
// Null when there is nothing to rewrite (another page, or no `lang` in the URL).
export function switchedShareLocaleUrl(href: string, locale: string): string | null {
    try {
        const url = new URL(href);
        if (!isSharedLinkPath(url.pathname) || !url.searchParams.has(SHARE_LOCALE_PARAM)) return null;
        url.searchParams.set(SHARE_LOCALE_PARAM, locale);
        return url.toString();
    } catch {
        return null;
    }
}
