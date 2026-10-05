import { NextResponse } from 'next/server';

import type { AuthResponseDto, AuthSessionDto } from '@/lib/api/types';
import { SpringAuthError } from '@/lib/auth/springAuth';

// Strips refreshToken/guestKey before anything reaches the client response —
// those stay server-side, in the httpOnly cookies the route handlers set.
export function toSessionDto(auth: AuthResponseDto): AuthSessionDto {
    return {
        accessToken: auth.accessToken,
        userId: auth.userId,
        email: auth.email,
        role: auth.role,
        firstName: auth.firstName,
        lastName: auth.lastName,
        profilePictureUrl: auth.profilePictureUrl,
        authProvider: auth.authProvider,
        isGuestAccount: auth.isGuestAccount,
        status: auth.status,
        createdAt: auth.createdAt,
    };
}

// Forwards Spring's status + ProblemDetail body as-is so the client's
// existing useApiErrorMessage/errorCode handling keeps working unchanged.
export function authErrorResponse(error: unknown): NextResponse {
    if (error instanceof SpringAuthError) {
        return NextResponse.json(error.body, { status: error.status });
    }
    return NextResponse.json(null, { status: 502 });
}

// Same shape as Spring's ProblemDetail errors (see authErrorResponse), so the
// client handles these like any other refusal.
function problemResponse(request: Request, status: number, title: string, detail: string, errorCode: number | string): NextResponse {
    return NextResponse.json(
        { type: 'about:blank', title, status, detail, instance: new URL(request.url).pathname, errorCode },
        { status, headers: { 'Content-Type': 'application/problem+json' } },
    );
}

function requestHost(request: Request): string | null {
    const host = request.headers.get('x-forwarded-host')?.split(',')[0]?.trim() || request.headers.get('host');
    return host ? host.toLowerCase() : null;
}

function originHost(origin: string): string | null {
    try {
        return new URL(origin).host;
    } catch {
        // "null" (a sandboxed frame, a redirect from elsewhere) or garbage.
        return null;
    }
}

// The routes that set or clear the session cookies answer this site's own
// pages only. The cookies are SameSite=Lax, which still lets another site
// submit a top-level form here: that is enough to sign a visitor into the
// attacker's account, or out of their own. Sec-Fetch-Site is the browser's
// own verdict; "same-site" is not enough, since a sibling subdomain counts as
// same-site. A browser too old to send it still sends Origin on a POST, so a
// request with neither did not come from a page of ours.
export function rejectCrossSiteRequest(request: Request): NextResponse | null {
    const fetchSite = request.headers.get('sec-fetch-site');
    const origin = request.headers.get('origin');
    const host = requestHost(request);

    const sameOrigin = fetchSite !== null ? fetchSite === 'same-origin' : origin !== null && host !== null && originHost(origin) === host;
    if (sameOrigin) return null;

    console.warn('Rejected a cross-site auth request', { path: new URL(request.url).pathname, fetchSite, origin });
    return problemResponse(request, 403, 'Forbidden', 'You do not have permission to perform this action', 'ACCESS_DENIED');
}

// request.json() parses any body whatever its Content-Type, and only a JSON
// body needs a CORS preflight. Requiring it shuts out the form posts
// (enctype="text/plain") another site could send.
export function rejectNonJsonBody(request: Request): NextResponse | null {
    const mediaType = request.headers.get('content-type')?.split(';')[0]?.trim().toLowerCase();
    if (mediaType === 'application/json') return null;

    // 3002 MALFORMED_REQUEST_BODY, what Spring answers a wrong Content-Type with.
    return problemResponse(request, 415, 'Unsupported Media Type', 'Content-Type must be application/json', 3002);
}
