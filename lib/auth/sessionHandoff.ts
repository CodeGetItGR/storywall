import type { AuthSessionDto, UserResponseDto } from '@/lib/api/types';

// What the server hands the browser on a full page load of a signed-in page:
// the session it already holds, so the app starts signed in without asking
// for a new token first (see app/(main)/layout.tsx).
export interface SessionHandoff {
    session: AuthSessionDto;
    // How long the access token has left, by the server's clock. 0 when its
    // expiry can't be read, so the browser refreshes it straight away.
    expiresInMs: number;
    // The /api/me answer the session was built from. Seeds useMe's cache.
    profile: UserResponseDto;
}

export function sessionFromProfile(accessToken: string, profile: UserResponseDto): AuthSessionDto {
    return {
        accessToken,
        userId: profile.id,
        email: profile.email,
        role: profile.platformRole,
        firstName: profile.firstName,
        lastName: profile.lastName,
        profilePictureUrl: profile.profilePictureUrl,
        authProvider: profile.authProvider,
        isGuestAccount: profile.isGuestAccount,
        status: profile.status,
        createdAt: profile.createdAt,
    };
}

// The time left before the access token expires, from the JWT's exp claim.
// Null when the token has no readable expiry.
export function accessTokenExpiresInMs(accessToken: string, now: number): number | null {
    const payload = accessToken.split('.')[1];
    if (!payload) return null;

    try {
        const claims: unknown = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
        const exp = typeof claims === 'object' && claims !== null ? (claims as { exp?: unknown }).exp : undefined;
        return typeof exp === 'number' ? exp * 1000 - now : null;
    } catch {
        return null;
    }
}
