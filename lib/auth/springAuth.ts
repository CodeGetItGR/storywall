// Server-only: the /api/auth/* route handlers' and middleware's direct line
// to Spring's auth endpoints. Never imported from client code — these calls
// carry the refresh token, which client JS must never see.

import type { Locale } from '@/i18n/config';
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

// This module bypasses lib/api/client.ts entirely (it carries the refresh
// token server-side), so Accept-Language must be threaded through explicitly
// rather than picked up from client.ts's own locale header — every caller
// resolves it from the incoming request (see i18n/resolveLocale.ts) and
// passes it in, since this file must stay runnable from both the Node
// runtime (route handlers) and the Edge runtime (proxy.ts).
async function springAuthFetch(path: string, body: unknown, locale: Locale): Promise<AuthResponseDto> {
    const res = await fetch(`${API_BASE_URL}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept-Language': locale },
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
    register: (input: { email: string; password: string; displayName: string; inviteToken?: string }, locale: Locale) =>
        springAuthFetch(endpoints.auth.register, input, locale),
    login: (input: { email: string; password: string; inviteToken?: string }, locale: Locale) => springAuthFetch(endpoints.auth.login, input, locale),
    oauth: (provider: 'GOOGLE' | 'APPLE', input: { idToken: string; inviteToken?: string }, locale: Locale) =>
        springAuthFetch(endpoints.auth.oauth(provider), input, locale),
    refresh: (refreshToken: string, locale: Locale) => springAuthFetch(endpoints.auth.refresh, { refreshToken }, locale),
    logout: (refreshToken: string, locale: Locale) => springAuthFetch(endpoints.auth.logout, { refreshToken }, locale),
};
