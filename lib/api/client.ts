import { defaultLocale, locales } from '@/i18n/config';
import { endpoints } from '@/lib/api/endpoints';
import type { AuthSessionDto, ProblemDetail, RecentErrorDto } from '@/lib/api/types';
import { clearSession, getAccessToken, setSession, subscribeAuthState } from '@/lib/auth/tokenStore';
import { redactApiPath } from '@/lib/betaFeedback/routeTemplates';
import { demoActAsHeaders } from '@/lib/demo/demoActAs';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? '';

// Reads the locale RootDocument rendered into <html lang>, so Spring
// localizes errors/notifications/PDFs in whatever language the user is
// actually looking at. That is the fully resolved locale (URL, then cookie,
// then browser language), which the cookie alone is not.
function getClientLocale(): string {
    if (typeof document === 'undefined') return defaultLocale;
    const pageLocale = document.documentElement.lang;
    return (locales as readonly string[]).includes(pageLocale) ? pageLocale : defaultLocale;
}

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

// The last failed API calls, attached to a bug report. Kept whether or not
// beta feedback is on — it's only memory. Paths are token-free templates.
const RECENT_ERRORS_MAX = 10;
const recentErrors: RecentErrorDto[] = [];
const RECORDABLE_METHODS = new Set(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']);
// A failed report must not end up inside the next report.
const UNRECORDED_PATHS = new Set<string>([endpoints.betaFeedback.bugReports, endpoints.betaFeedback.clientErrors]);

export function recordFailedCall(method: string | undefined, path: string, status: number, body: unknown): void {
    const templatePath = redactApiPath(path);
    if (UNRECORDED_PATHS.has(templatePath)) return;
    if (status < 100 || status > 599) return;

    const upperMethod = (method ?? 'GET').toUpperCase();
    const problem = isProblemDetail(body) ? body : undefined;
    const errorCode = problem?.errorCode;
    const errorRef = problem?.errorRef;

    recentErrors.push({
        method: RECORDABLE_METHODS.has(upperMethod) ? upperMethod : null,
        path: templatePath,
        status,
        // The 401/403 entrypoints send a string code; the server only takes 0-99999.
        errorCode: typeof errorCode === 'number' && errorCode >= 0 && errorCode <= 99999 ? errorCode : null,
        errorRef: typeof errorRef === 'string' && /^[0-9a-f]{12}$/.test(errorRef) ? errorRef : null,
        at: new Date().toISOString(),
    });
    if (recentErrors.length > RECENT_ERRORS_MAX) recentErrors.splice(0, recentErrors.length - RECENT_ERRORS_MAX);
}

export function getRecentErrors(): RecentErrorDto[] {
    return recentErrors.map((entry) => ({ ...entry }));
}

export function clearRecentErrors(): void {
    recentErrors.length = 0;
}

type ApiFetchOptions = RequestInit & { allowNotModified?: boolean; skipAuthRetry?: boolean };

// The refresh flow is only ever run once at a time, no matter how many
// requests 401 concurrently — every caller awaits the same promise. The
// actual refresh logic now lives server-side, behind /api/auth/session (see
// app/api/auth/session/route.ts) — it reads the httpOnly refresh cookie this
// module never has access to.
let refreshPromise: Promise<string | null> | null = null;

async function reauthenticate(): Promise<string | null> {
    if (refreshPromise) return refreshPromise;

    refreshPromise = (async () => {
        try {
            const res = await fetch(endpoints.auth.session);
            // Only a 401 means the session is gone. Anything else is the route
            // (or Spring behind it) being unable to answer right now — the
            // refresh cookie is still there and the next attempt may succeed.
            if (res.status === 401) clearSession();
            if (!res.ok) return null;

            const session = (await res.json()) as AuthSessionDto;
            setSession(session);
            return session.accessToken;
        } catch {
            return null;
        }
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

type ApiErrorListener = (error: ApiError) => void;
const apiErrorListeners = new Set<ApiErrorListener>();

// Hears every failed response, whether or not the call went through React
// Query. Only the browser subscribes (from an effect), so server-side use of
// this module never accumulates listeners across requests.
export function subscribeApiErrors(listener: ApiErrorListener): () => void {
    apiErrorListeners.add(listener);
    return () => {
        apiErrorListeners.delete(listener);
    };
}

// Every non-OK response from Spring ends here: record it, build the error, tell the listeners.
function failedResponseError(method: string | undefined, path: string, res: Response, body: unknown): ApiError {
    recordFailedCall(method, path, res.status, body);
    const error = new ApiError(res.status, body, undefined, res.headers.get('retry-after'));
    for (const listener of apiErrorListeners) listener(error);
    return error;
}

// Bare fetch straight to Spring with no auth header and no retry-on-401 —
// used by api.publicGet for the handful of endpoints that don't require auth.
async function rawFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
    const res = await fetch(`${API_BASE_URL}${path}`, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            'Accept-Language': getClientLocale(),
            ...options.headers,
        },
    });

    const body = await parseResponseBody(res);

    if (!res.ok) {
        throw failedResponseError(options.method, path, res, body);
    }

    return body as T;
}

// Public multipart POST — no auth header, no 401 retry. Used by the two
// anonymous QR media-upload endpoints, which take the scanned QR token
// itself as the credential instead of a bearer token.
async function rawPostForm<T>(path: string, formData: FormData, options: RequestInit = {}): Promise<T> {
    const res = await fetch(`${API_BASE_URL}${path}`, {
        ...options,
        method: 'POST',
        body: formData,
        headers: {
            'Accept-Language': getClientLocale(),
            ...options.headers,
        },
    });

    const body = await parseResponseBody(res);

    if (!res.ok) {
        throw failedResponseError('POST', path, res, body);
    }

    return body as T;
}

async function apiFetchResponse(path: string, options: ApiFetchOptions = {}): Promise<Response> {
    const { allowNotModified, skipAuthRetry, ...init } = options;
    const accessToken = getAccessToken();
    const isFormData = init.body instanceof FormData;

    const res = await fetch(`${API_BASE_URL}${path}`, {
        ...init,
        headers: {
            ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
            'Accept-Language': getClientLocale(),
            ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
            ...demoActAsHeaders(init.method, path),
            ...init.headers,
        },
    });

    if (res.status === 401 && !skipAuthRetry) {
        const newAccessToken = await reauthenticate();
        if (newAccessToken) {
            return apiFetchResponse(path, { ...options, skipAuthRetry: true });
        }
    }

    if (!res.ok && !(allowNotModified && res.status === 304)) {
        const body = await parseResponseBody(res);
        throw failedResponseError(init.method, path, res, body);
    }

    return res;
}

async function apiConditionalGet<T>(path: string, options: RequestInit = {}): Promise<{ data?: T; etag?: string; notModified: boolean }> {
    const res = await apiFetchResponse(path, { ...options, allowNotModified: true, method: 'GET' });
    if (res.status === 304) return { notModified: true };
    return { data: (await parseResponseBody(res)) as T, etag: res.headers.get('etag') ?? undefined, notModified: false };
}

async function apiFetch<T>(path: string, options: ApiFetchOptions = {}): Promise<T> {
    const res = await apiFetchResponse(path, options);
    const body = await parseResponseBody(res);
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
    conditionalGet: <T>(path: string, options?: RequestInit) => apiConditionalGet<T>(path, options),
    url: (path: string) => `${API_BASE_URL}${path}`,
    download: (path: string, options?: RequestInit) => apiFetchResponse(path, { ...options, method: 'GET' }),
    publicGet: <T>(path: string, options?: RequestInit) => rawFetch<T>(path, { ...options, method: 'GET' }),
    publicPostForm: <T>(path: string, formData: FormData, options?: RequestInit) => rawPostForm<T>(path, formData, options),
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
