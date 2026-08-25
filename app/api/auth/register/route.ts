import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

import { ACCESS_TOKEN_MAX_AGE_SECONDS, AUTH_COOKIES, baseCookieOptions } from '@/lib/auth/authCookies';
import { authErrorResponse, toSessionDto } from '@/lib/auth/authRouteHelpers';
import { springAuth } from '@/lib/auth/springAuth';

export async function POST(request: Request) {
    const input = await request.json();

    try {
        const auth = await springAuth.register(input);
        const cookieStore = await cookies();

        cookieStore.set(AUTH_COOKIES.accessToken, auth.accessToken, { ...baseCookieOptions(), maxAge: ACCESS_TOKEN_MAX_AGE_SECONDS });
        if (auth.refreshToken) cookieStore.set(AUTH_COOKIES.refreshToken, auth.refreshToken, baseCookieOptions());

        return NextResponse.json(toSessionDto(auth));
    } catch (error) {
        return authErrorResponse(error);
    }
}
