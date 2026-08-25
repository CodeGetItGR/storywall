// Client-side counterpart to lib/auth/springAuth.ts: hits this app's own
// /api/auth/* route handlers (relative, same-origin) instead of Spring
// directly, so the browser only ever sees the short-lived access token that
// comes back in the JSON body — refresh/guest tokens stay in httpOnly
// cookies set by those route handlers.

import { ApiError } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { AuthSessionDto } from '@/lib/api/types';

async function parseBody(res: Response): Promise<unknown> {
    const text = await res.text();
    if (!text) return null;
    try {
        return JSON.parse(text);
    } catch {
        return text;
    }
}

async function authRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
    const res = await fetch(path, {
        ...options,
        headers: { 'Content-Type': 'application/json', ...options.headers },
    });

    const body = await parseBody(res);
    if (!res.ok) throw new ApiError(res.status, body);
    return body as T;
}

export const authClient = {
    register: (input: { email: string; password: string; displayName: string }) =>
        authRequest<AuthSessionDto>(endpoints.auth.register, { method: 'POST', body: JSON.stringify(input) }),

    login: (input: { email: string; password: string }) =>
        authRequest<AuthSessionDto>(endpoints.auth.login, { method: 'POST', body: JSON.stringify(input) }),

    guestLogin: (input: { inviteToken: string; displayName: string }) =>
        authRequest<AuthSessionDto>(endpoints.auth.guestLogin, { method: 'POST', body: JSON.stringify(input) }),

    // Bootstrap/reactive-refresh: 401 means there's no re-derivable session
    // (no refresh cookie, no guest cookie, or both rejected) — not an error.
    session: async (): Promise<AuthSessionDto | null> => {
        const res = await fetch(endpoints.auth.session);
        if (res.status === 401) return null;

        const body = await parseBody(res);
        if (!res.ok) throw new ApiError(res.status, body);
        return body as AuthSessionDto;
    },

    logout: async (): Promise<void> => {
        await fetch(endpoints.auth.logout, { method: 'POST' });
    },
};
