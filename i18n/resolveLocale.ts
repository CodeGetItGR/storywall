import { defaultLocale, type Locale, locales } from '@/i18n/config';

// Shared by i18n/request.ts (which locale to render the UI in) and every
// server-side call out to Spring (which locale to send as Accept-Language) —
// both must agree, so this lives in one place. Pure function: works in both
// the Node runtime (route handlers) and the Edge runtime (proxy.ts).
export function resolveLocale(cookieLocale: string | undefined, acceptLanguage: string | null): Locale {
    if (cookieLocale && (locales as readonly string[]).includes(cookieLocale)) {
        return cookieLocale as Locale;
    }

    if (acceptLanguage) {
        const preferred = acceptLanguage.split(',')[0]?.split('-')[0];
        if (preferred && (locales as readonly string[]).includes(preferred)) {
            return preferred as Locale;
        }
    }

    return defaultLocale;
}
