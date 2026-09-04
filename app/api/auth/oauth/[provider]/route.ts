import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

import { localeCookieName } from '@/i18n/config';
import { resolveLocale } from '@/i18n/resolveLocale';
import { ACCESS_TOKEN_MAX_AGE_SECONDS, AUTH_COOKIES, baseCookieOptions } from '@/lib/auth/authCookies';
import { authErrorResponse, toSessionDto } from '@/lib/auth/authRouteHelpers';
import { springAuth } from '@/lib/auth/springAuth';

export async function POST(request: Request, { params }: { params: Promise<{ provider: string }> }) {
    const { provider } = await params;
    if (provider !== 'GOOGLE' && provider !== 'APPLE') {
        return NextResponse.json(null, { status: 400 });
    }

    const input = await request.json();

    try {
        const cookieStore = await cookies();
        const locale = resolveLocale(cookieStore.get(localeCookieName)?.value, request.headers.get('accept-language'));
        const auth = await springAuth.oauth(provider, input, locale);

        cookieStore.set(AUTH_COOKIES.accessToken, auth.accessToken, { ...baseCookieOptions(), maxAge: ACCESS_TOKEN_MAX_AGE_SECONDS });
        if (auth.refreshToken) cookieStore.set(AUTH_COOKIES.refreshToken, auth.refreshToken, baseCookieOptions());

        return NextResponse.json(toSessionDto(auth));
    } catch (error) {
        return authErrorResponse(error);
    }
}
