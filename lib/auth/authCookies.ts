// Server-only cookie contract shared by the /api/auth/* route handlers and
// middleware.ts. Everything here is httpOnly — none of it is meant to be
// readable by client JS; that's the whole point of moving off
// sessionStorage/localStorage (see lib/auth/tokenStore.ts).

export const AUTH_COOKIES = {
    // Current access token. Short-lived, mirrors the same lifetime Spring
    // issues it with, so the browser stops sending it once stale — that's
    // what lets middleware tell "needs a refresh" apart from "still fresh"
    // without decoding anything.
    accessToken: 'storywall_at',
    // Registered-user refresh token. No maxAge (session cookie) to match the
    // previous sessionStorage scoping — cleared when the browser closes.
    refreshToken: 'storywall_rt',
} as const;

// Server Components can't read/refresh cookies themselves (that's restricted
// to Route Handlers/Server Actions), so middleware.ts does the refresh-and-
// rotate work up front and hands the result down as a plain request header —
// see app/(app)/(event)/layout.tsx, which reads this to prefetch server-side.
export const ACCESS_TOKEN_HEADER = 'x-storywall-access-token';

export const ACCESS_TOKEN_MAX_AGE_SECONDS = 15 * 60;

export function baseCookieOptions() {
    return {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax' as const,
        path: '/',
    };
}
