import { cookies, headers } from 'next/headers';
import { NextResponse } from 'next/server';

import { localeCookieName } from '@/i18n/config';
import { resolveLocale } from '@/i18n/resolveLocale';
import { AUTH_COOKIES } from '@/lib/auth/authCookies';
import { rejectCrossSiteRequest } from '@/lib/auth/authRouteHelpers';
import { clientIpFrom, springAuth } from '@/lib/auth/springAuth';

// No body, so only the origin check: it keeps another site from signing the
// visitor out.
export async function POST(request: Request) {
    const rejection = rejectCrossSiteRequest(request);
    if (rejection) return rejection;

    const cookieStore = await cookies();
    const refreshToken = cookieStore.get(AUTH_COOKIES.refreshToken)?.value;

    if (refreshToken) {
        try {
            const headerStore = await headers();
            const locale = resolveLocale(cookieStore.get(localeCookieName)?.value, headerStore.get('accept-language'));
            await springAuth.logout(refreshToken, locale, clientIpFrom(headerStore));
        } catch {
            // Best-effort, mirrors the previous client-side logout semantics.
        }
    }

    cookieStore.delete(AUTH_COOKIES.accessToken);
    cookieStore.delete(AUTH_COOKIES.refreshToken);

    return new NextResponse(null, { status: 204 });
}
