// Server-only: the /api/auth/* route handlers' and middleware's direct line
// to Spring's auth endpoints. Never imported from client code — these calls
// carry the refresh token, which client JS must never see.

import { endpoints } from '@/lib/api/endpoints';
import type { AuthResponseDto } from '@/lib/api/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? '';

export class SpringAuthError extends Error {
    status: number;
    body: unknown;

    constructor(status: number, body: unknown) {
        super(`Spring auth request failed with status ${status}`);
        this.name = 'SpringAuthError';
        this.status = status;
        this.body = body;
    }
}

async function springAuthFetch(path: string, body: unknown): Promise<AuthResponseDto> {
    const res = await fetch(`${API_BASE_URL}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        cache: 'no-store',
    });

    const text = await res.text();
    const parsed = text ? JSON.parse(text) : null;

    if (!res.ok) {
        throw new SpringAuthError(res.status, parsed);
    }

    return parsed as AuthResponseDto;
}

export const springAuth = {
    register: (input: { email: string; password: string; displayName: string }) => springAuthFetch(endpoints.auth.register, input),
    login: (input: { email: string; password: string }) => springAuthFetch(endpoints.auth.login, input),
    guestLogin: (input: { inviteToken: string; displayName: string; guestKey?: string }) => springAuthFetch(endpoints.auth.guestLogin, input),
    refresh: (refreshToken: string) => springAuthFetch(endpoints.auth.refresh, { refreshToken }),
    logout: (refreshToken: string) => springAuthFetch(endpoints.auth.logout, { refreshToken }),
};
