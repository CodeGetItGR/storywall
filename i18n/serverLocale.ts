import { cookies, headers } from 'next/headers';

import { localeCookieName } from '@/i18n/config';
import { resolveLocale } from '@/i18n/resolveLocale';

// Node-runtime helper (Server Components, Route Handlers) — reads the same
// NEXT_LOCALE cookie next-intl renders the UI in, so the Accept-Language we
// send to Spring always matches what the user is looking at.
export async function getServerLocale() {
    const cookieStore = await cookies();
    const headerStore = await headers();
    return resolveLocale(cookieStore.get(localeCookieName)?.value, headerStore.get('accept-language'));
}
