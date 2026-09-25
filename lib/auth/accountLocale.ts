// Server-only: used by the sign-in route handlers right after Spring issues
// the session.

import type { cookies } from 'next/headers';

import { defaultLocale, type Locale, localeCookieMaxAge, localeCookieName, locales } from '@/i18n/config';
import { endpoints } from '@/lib/api/endpoints';
import type { UserResponseDto } from '@/lib/api/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? '';

type CookieStore = Awaited<ReturnType<typeof cookies>>;

function isLocale(value: string | null | undefined): value is Locale {
    return !!value && (locales as readonly string[]).includes(value);
}

// Brings the account's saved language to a device that has no saved choice
// yet, e.g. the first sign-in on a new phone. A choice already saved on this
// device always wins. Every account starts as the default locale, so only
// another locale counts as a real choice; otherwise the browser language
// stays in charge. Best-effort: a failure here never blocks sign-in.
export async function restoreAccountLocale(cookieStore: CookieStore, accessToken: string, locale: Locale): Promise<void> {
    if (isLocale(cookieStore.get(localeCookieName)?.value)) return;

    try {
        const res = await fetch(`${API_BASE_URL}${endpoints.me.profile}`, {
            headers: { Authorization: `Bearer ${accessToken}`, 'Accept-Language': locale },
            cache: 'no-store',
        });
        if (!res.ok) return;

        const user = (await res.json()) as UserResponseDto;
        if (isLocale(user.locale) && user.locale !== defaultLocale) {
            cookieStore.set(localeCookieName, user.locale, { path: '/', maxAge: localeCookieMaxAge });
        }
    } catch {
        // Keep the language this device already resolved.
    }
}
