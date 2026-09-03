import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

import { AUTH_COOKIES } from '@/lib/auth/authCookies';
import { springAuth } from '@/lib/auth/springAuth';

export async function POST() {
    const cookieStore = await cookies();
    const refreshToken = cookieStore.get(AUTH_COOKIES.refreshToken)?.value;

    if (refreshToken) {
        try {
            await springAuth.logout(refreshToken);
        } catch {
            // Best-effort, mirrors the previous client-side logout semantics.
        }
    }

    cookieStore.delete(AUTH_COOKIES.accessToken);
    cookieStore.delete(AUTH_COOKIES.refreshToken);

    return new NextResponse(null, { status: 204 });
}
