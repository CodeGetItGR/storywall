import { cookies, headers } from 'next/headers';
import { getRequestConfig } from 'next-intl/server';

import { type Locale, localeCookieName, locales } from '@/i18n/config';
import { PUBLIC_LOCALE_HEADER } from '@/i18n/publicMessages';
import { resolveLocale } from '@/i18n/resolveLocale';

export default getRequestConfig(async ({ requestLocale }) => {
    const cookieStore = await cookies();
    const headerStore = await headers();
    const routeLocale = await requestLocale;
    const forcedLocale = headerStore.get(PUBLIC_LOCALE_HEADER);
    const localeFromRoute = routeLocale ?? forcedLocale;

    const locale =
        localeFromRoute && (locales as readonly string[]).includes(localeFromRoute)
            ? (localeFromRoute as Locale)
            : resolveLocale(cookieStore.get(localeCookieName)?.value, headerStore.get('accept-language'));

    return {
        locale,
        messages: (await import(`../messages/${locale}.json`)).default,
    };
});
