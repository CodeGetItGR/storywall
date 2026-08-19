import { endpoints } from '@/lib/api/endpoints';
import type { AuthResponseDto, ProblemDetail } from '@/lib/api/types';
import {
    clearSession,
    getAccessToken,
    getOrCreateGuestKey,
    getStoredInviteToken,
    getStoredRefreshToken,
    setSession,
    setStoredRefreshToken,
    subscribeAuthState,
} from '@/lib/auth/tokenStore';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? '';

export class ApiError extends Error {
    status: number;
    body: unknown;
    problem?: ProblemDetail;
    retryAfterSeconds?: number;

    constructor(status: number, body: unknown, message?: string, retryAfterHeader?: string | null) {
        super(message ?? `API request failed with status ${status}`);
        this.name = 'ApiError';
        this.status = status;
        this.body = body;
        this.problem = isProblemDetail(body) ? body : undefined;
        // The ProblemDetail carries the wait, but a 429 from an edge/proxy may
        // arrive with no body at all — fall back to the Retry-After header,
        // which the guide guarantees is identical when both are present.
        this.retryAfterSeconds =
            status === 429 ? ((this.problem?.retryAfterSeconds as number | undefined) ?? parseRetryAfter(retryAfterHeader)) : undefined;
    }
}

// `Retry-After` is either a delay in seconds or an HTTP date. Both are legal;
// the backend sends seconds, but a proxy in front of it may not.
function parseRetryAfter(header?: string | null): number | undefined {
    if (!header) return undefined;
    const seconds = Number(header);
    if (Number.isFinite(seconds)) return Math.max(0, Math.round(seconds));
    const date = Date.parse(header);
    if (Number.isNaN(date)) return undefined;
    return Math.max(0, Math.round((date - Date.now()) / 1000));
}

function isProblemDetail(body: unknown): body is ProblemDetail {
    return typeof body === 'object' && body !== null && 'errorCode' in body;
}

// Error responses come back as RFC 7807 `application/problem+json`, not
// `application/json` — match on "json" generically so both (and any other
// +json suffix) get parsed instead of silently falling through to .text().
function isJsonContentType(contentType: string | null): boolean {
    return contentType !== null && /json/i.test(contentType);
}

type ApiFetchOptions = RequestInit & { skipAuthRetry?: boolean };

// The refresh/guest-relogin flow is only ever run once at a time, no matter
// how many requests 401 concurrently — every caller awaits the same promise.
let refreshPromise: Promise<string | null> | null = null;

async function reauthenticate(): Promise<string | null> {
    if (refreshPromise) return refreshPromise;

    refreshPromise = (async () => {
        const refreshToken = getStoredRefreshToken();
        const inviteToken = getStoredInviteToken();

        try {
            if (refreshToken) {
                const auth = await rawFetch<AuthResponseDto>(endpoints.auth.refresh, {
                    method: 'POST',
                    body: JSON.stringify({ refreshToken }),
                });
                setSession(auth);
                if (auth.refreshToken) setStoredRefreshToken(auth.refreshToken);
                return auth.accessToken;
            }

            if (inviteToken) {
                const auth = await rawFetch<AuthResponseDto>(endpoints.auth.guestLogin, {
                    method: 'POST',
                    body: JSON.stringify({ inviteToken, displayName: 'Guest', guestKey: getOrCreateGuestKey() ?? undefined }),
                });
                setSession(auth);
                return auth.accessToken;
            }
        } catch {
            clearSession();
            return null;
        }

        clearSession();
        return null;
    })();

    try {
        return await refreshPromise;
    } finally {
        refreshPromise = null;
    }
}

// The access token is short-lived (~15 min per the integration guide) and we
// get no expiresIn back from the API, so schedule a proactive refresh a
// minute before that instead of waiting for a request to hit a 401. This is
// a backstop on top of the reactive retry in apiFetch — it just avoids every
// user hitting a guaranteed-failed request once the token goes stale.
const ACCESS_TOKEN_LIFETIME_MS = 15 * 60 * 1000;
const REFRESH_BEFORE_EXPIRY_MS = 60 * 1000;

let proactiveRefreshTimer: ReturnType<typeof setTimeout> | null = null;

if (typeof window !== 'undefined') {
    subscribeAuthState((state) => {
        if (proactiveRefreshTimer) {
            clearTimeout(proactiveRefreshTimer);
            proactiveRefreshTimer = null;
        }

        if (!state.accessToken) return;

        proactiveRefreshTimer = setTimeout(() => {
            void reauthenticate();
        }, ACCESS_TOKEN_LIFETIME_MS - REFRESH_BEFORE_EXPIRY_MS);
    });
}

// Bare fetch with no auth header and no retry-on-401 — used internally by
// reauthenticate() so refresh/guest-login calls can't recurse into themselves.
async function rawFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
    const res = await fetch(`${API_BASE_URL}${path}`, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...options.headers,
        },
    });

    const body = await parseResponseBody(res);

    if (!res.ok) {
        throw new ApiError(res.status, body, undefined, res.headers.get('retry-after'));
    }

    return body as T;
}

async function apiFetch<T>(path: string, options: ApiFetchOptions = {}): Promise<T> {
    const { skipAuthRetry, ...init } = options;
    const accessToken = getAccessToken();
    const isFormData = init.body instanceof FormData;

    const res = await fetch(`${API_BASE_URL}${path}`, {
        ...init,
        headers: {
            ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
            ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
            ...init.headers,
        },
    });

    const body = await parseResponseBody(res);

    if (res.status === 401 && !skipAuthRetry) {
        const newAccessToken = await reauthenticate();
        if (newAccessToken) {
            return apiFetch<T>(path, { ...options, skipAuthRetry: true });
        }
    }

    if (!res.ok) {
        throw new ApiError(res.status, body, undefined, res.headers.get('retry-after'));
    }

    return body as T;
}

async function parseResponseBody(res: Response): Promise<unknown> {
    const contentType = res.headers.get('content-type');
    const text = await res.text();
    if (!text) return null;
    if (!isJsonContentType(contentType)) return text;

    try {
        return JSON.parse(text);
    } catch {
        return text;
    }
}

export const api = {
    get: <T>(path: string, options?: RequestInit) => apiFetch<T>(path, { ...options, method: 'GET' }),
    publicGet: <T>(path: string, options?: RequestInit) => rawFetch<T>(path, { ...options, method: 'GET' }),
    post: <T>(path: string, data?: unknown, options?: RequestInit) =>
        apiFetch<T>(path, {
            ...options,
            method: 'POST',
            body: data ? JSON.stringify(data) : undefined,
        }),
    put: <T>(path: string, data?: unknown, options?: RequestInit) =>
        apiFetch<T>(path, {
            ...options,
            method: 'PUT',
            body: data ? JSON.stringify(data) : undefined,
        }),
    patch: <T>(path: string, data?: unknown, options?: RequestInit) =>
        apiFetch<T>(path, {
            ...options,
            method: 'PATCH',
            body: data ? JSON.stringify(data) : undefined,
        }),
    del: <T>(path: string, options?: RequestInit) => apiFetch<T>(path, { ...options, method: 'DELETE' }),
    // Multipart upload — apiFetch detects the FormData body and omits
    // Content-Type so the browser can set its own boundary.
    postForm: <T>(path: string, formData: FormData, options?: RequestInit) => apiFetch<T>(path, { ...options, method: 'POST', body: formData }),
};
