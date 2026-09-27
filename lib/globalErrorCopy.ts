import { defaultLocale, type Locale, locales } from '@/i18n/config';

// app/global-error.tsx replaces the root layout, so it renders outside
// NextIntlClientProvider and can't read messages/*.json without shipping the
// whole catalog to the client. Its three strings live here instead.
const COPY: Record<Locale, { title: string; description: string; retry: string }> = {
    en: { title: 'Something went wrong', description: 'This page stopped working.', retry: 'Try again' },
    el: { title: 'Κάτι πήγε στραβά', description: 'Η σελίδα σταμάτησε να λειτουργεί.', retry: 'Δοκιμάστε ξανά' },
};

export function getGlobalErrorCopy(lang: string | undefined) {
    const locale = (locales as readonly string[]).includes(lang ?? '') ? (lang as Locale) : defaultLocale;
    return { locale, ...COPY[locale] };
}
