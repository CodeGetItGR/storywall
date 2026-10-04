// Server-only: the /api/auth/* route handlers' and middleware's direct line
// to Spring's auth endpoints. Never imported from client code — these calls
// carry the refresh token, which client JS must never see.

import type { Locale } from '@/i18n/config';
import { endpoints } from '@/lib/api/endpoints';
import type { AuthResponseDto, OAuthLoginRequestDto, RegisterRequestDto } from '@/lib/api/types';

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

// Spring rate-limits these calls per client address when there is no user
// yet, and every one of them reaches Spring from this server's address, not
// the browser's: without the browser's own address, all sign-ups on the
// platform share one budget (auth.register allows five an hour). Spring only
// believes the forwarded address alongside CLIENT_IP_FORWARDING_SECRET, the
// same value set on the backend — anyone holding it can pick their own rate-
// limit identity, so it must never become a NEXT_PUBLIC_ variable.
export const CLIENT_IP_HEADER = 'X-Storywall-Client-Ip';
export const CLIENT_IP_SECRET_HEADER = 'X-Storywall-Client-Ip-Secret';

// The browser's address as our host saw it. Vercel overwrites
// x-forwarded-for with the connecting client's address, so its first entry is
// not something the browser gets to choose.
export function clientIpFrom(headers: Pick<Headers, 'get'>): string | null {
    const forwarded = headers.get('x-forwarded-for')?.split(',')[0]?.trim();
    return forwarded || headers.get('x-real-ip')?.trim() || null;
}

function clientIpHeaders(clientIp: string | null): Record<string, string> {
    const secret = process.env.CLIENT_IP_FORWARDING_SECRET;
    if (!secret || !clientIp) return {};
    return { [CLIENT_IP_HEADER]: clientIp, [CLIENT_IP_SECRET_HEADER]: secret };
}

// This module bypasses lib/api/client.ts entirely (it carries the refresh
// token server-side), so Accept-Language must be threaded through explicitly
// rather than picked up from client.ts's own locale header — every caller
// resolves it from the incoming request (see i18n/resolveLocale.ts) and
// passes it in, since this file must stay runnable from both the Node
// runtime (route handlers) and the Edge runtime (proxy.ts). The client
// address is threaded through the same way (see clientIpFrom).
async function springAuthFetch(path: string, body: unknown, locale: Locale, clientIp: string | null): Promise<AuthResponseDto> {
    const res = await fetch(`${API_BASE_URL}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept-Language': locale, ...clientIpHeaders(clientIp) },
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
    register: (input: RegisterRequestDto, locale: Locale, clientIp: string | null) =>
        springAuthFetch(endpoints.auth.register, input, locale, clientIp),
    login: (input: { email: string; password: string; inviteToken?: string }, locale: Locale, clientIp: string | null) =>
        springAuthFetch(endpoints.auth.login, input, locale, clientIp),
    oauth: (provider: 'GOOGLE' | 'APPLE', input: OAuthLoginRequestDto, locale: Locale, clientIp: string | null) =>
        springAuthFetch(endpoints.auth.oauth(provider), input, locale, clientIp),
    refresh: (refreshToken: string, locale: Locale, clientIp: string | null) =>
        springAuthFetch(endpoints.auth.refresh, { refreshToken }, locale, clientIp),
    logout: (refreshToken: string, locale: Locale, clientIp: string | null) =>
        springAuthFetch(endpoints.auth.logout, { refreshToken }, locale, clientIp),
};
