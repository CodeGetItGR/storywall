import { cookies, headers } from 'next/headers';
import { NextResponse } from 'next/server';

import { localeCookieName } from '@/i18n/config';
import { resolveLocale } from '@/i18n/resolveLocale';
import { ACCESS_TOKEN_MAX_AGE_SECONDS, AUTH_COOKIES, baseCookieOptions } from '@/lib/auth/authCookies';
import { toSessionDto } from '@/lib/auth/authRouteHelpers';
import { springAuth } from '@/lib/auth/springAuth';

function clearAuthCookies(cookieStore: Awaited<ReturnType<typeof cookies>>) {
    cookieStore.delete(AUTH_COOKIES.accessToken);
    cookieStore.delete(AUTH_COOKIES.refreshToken);
}

export async function GET() {
    const cookieStore = await cookies();
    const refreshToken = cookieStore.get(AUTH_COOKIES.refreshToken)?.value;

    if (!refreshToken) {
        clearAuthCookies(cookieStore);
        return NextResponse.json(null, { status: 401 });
    }

    try {
        const headerStore = await headers();
        const locale = resolveLocale(cookieStore.get(localeCookieName)?.value, headerStore.get('accept-language'));
        const auth = await springAuth.refresh(refreshToken, locale);

        cookieStore.set(AUTH_COOKIES.accessToken, auth.accessToken, { ...baseCookieOptions(), maxAge: ACCESS_TOKEN_MAX_AGE_SECONDS });
        if (auth.refreshToken) cookieStore.set(AUTH_COOKIES.refreshToken, auth.refreshToken, baseCookieOptions());

        return NextResponse.json(toSessionDto(auth));
    } catch {
        clearAuthCookies(cookieStore);
        return NextResponse.json(null, { status: 401 });
    }
}
