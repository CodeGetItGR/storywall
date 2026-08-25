import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

import { AUTH_COOKIES, baseCookieOptions, decodeGuestCookie, encodeGuestCookie, GUEST_ACCESS_TOKEN_MAX_AGE_SECONDS } from '@/lib/auth/authCookies';
import { authErrorResponse, toSessionDto } from '@/lib/auth/authRouteHelpers';
import { springAuth } from '@/lib/auth/springAuth';

export async function POST(request: Request) {
    const input = await request.json();
    const cookieStore = await cookies();
    const existingGuest = decodeGuestCookie(cookieStore.get(AUTH_COOKIES.guest)?.value);

    try {
        const auth = await springAuth.guestLogin({
            inviteToken: input.inviteToken,
            displayName: input.displayName,
            guestKey: existingGuest?.guestKey,
        });

        cookieStore.set(AUTH_COOKIES.accessToken, auth.accessToken, { ...baseCookieOptions(), maxAge: GUEST_ACCESS_TOKEN_MAX_AGE_SECONDS });
        cookieStore.set(
            AUTH_COOKIES.guest,
            encodeGuestCookie({ inviteToken: input.inviteToken, guestKey: auth.guestKey ?? existingGuest?.guestKey }),
            { ...baseCookieOptions(), maxAge: GUEST_ACCESS_TOKEN_MAX_AGE_SECONDS }
        );

        return NextResponse.json(toSessionDto(auth));
    } catch (error) {
        return authErrorResponse(error);
    }
}
