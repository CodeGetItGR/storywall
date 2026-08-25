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
        displayName: auth.displayName,
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
