import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

import {
    ACCESS_TOKEN_MAX_AGE_SECONDS,
    AUTH_COOKIES,
    baseCookieOptions,
    decodeGuestCookie,
    encodeGuestCookie,
    GUEST_ACCESS_TOKEN_MAX_AGE_SECONDS,
} from '@/lib/auth/authCookies';
import { toSessionDto } from '@/lib/auth/authRouteHelpers';
import { springAuth } from '@/lib/auth/springAuth';

function clearAuthCookies(cookieStore: Awaited<ReturnType<typeof cookies>>) {
    cookieStore.delete(AUTH_COOKIES.accessToken);
    cookieStore.delete(AUTH_COOKIES.refreshToken);
    cookieStore.delete(AUTH_COOKIES.guest);
}

export async function GET() {
    const cookieStore = await cookies();
    const refreshToken = cookieStore.get(AUTH_COOKIES.refreshToken)?.value;
    const guest = decodeGuestCookie(cookieStore.get(AUTH_COOKIES.guest)?.value);

    try {
        if (refreshToken) {
            const auth = await springAuth.refresh(refreshToken);

            cookieStore.set(AUTH_COOKIES.accessToken, auth.accessToken, { ...baseCookieOptions(), maxAge: ACCESS_TOKEN_MAX_AGE_SECONDS });
            if (auth.refreshToken) cookieStore.set(AUTH_COOKIES.refreshToken, auth.refreshToken, baseCookieOptions());

            return NextResponse.json(toSessionDto(auth));
        }

        if (guest) {
            const auth = await springAuth.guestLogin({ inviteToken: guest.inviteToken, displayName: 'Guest', guestKey: guest.guestKey });

            cookieStore.set(AUTH_COOKIES.accessToken, auth.accessToken, { ...baseCookieOptions(), maxAge: GUEST_ACCESS_TOKEN_MAX_AGE_SECONDS });
            cookieStore.set(AUTH_COOKIES.guest, encodeGuestCookie({ inviteToken: guest.inviteToken, guestKey: auth.guestKey ?? guest.guestKey }), {
                ...baseCookieOptions(),
                maxAge: GUEST_ACCESS_TOKEN_MAX_AGE_SECONDS,
            });

            return NextResponse.json(toSessionDto(auth));
        }
    } catch {
        clearAuthCookies(cookieStore);
        return NextResponse.json(null, { status: 401 });
    }

    clearAuthCookies(cookieStore);
    return NextResponse.json(null, { status: 401 });
}
