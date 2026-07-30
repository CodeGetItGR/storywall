import { endpoints } from "@/lib/api/endpoints";
import type { AuthResponseDto, ProblemDetail } from "@/lib/api/types";
import {
  clearSession,
  getAccessToken,
  getStoredInviteToken,
  getStoredRefreshToken,
  setSession,
  setStoredRefreshToken,
} from "@/lib/auth/tokenStore";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

export class ApiError extends Error {
  status: number;
  body: unknown;
  problem?: ProblemDetail;

  constructor(status: number, body: unknown, message?: string) {
    super(message ?? `API request failed with status ${status}`);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
    this.problem = isProblemDetail(body) ? body : undefined;
  }
}

function isProblemDetail(body: unknown): body is ProblemDetail {
  return typeof body === "object" && body !== null && "errorCode" in body;
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
          method: "POST",
          body: JSON.stringify({ refreshToken }),
        });
        setSession(auth);
        if (auth.refreshToken) setStoredRefreshToken(auth.refreshToken);
        return auth.accessToken;
      }

      if (inviteToken) {
        const auth = await rawFetch<AuthResponseDto>(endpoints.auth.guestLogin, {
          method: "POST",
          body: JSON.stringify({ inviteToken }),
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

// Bare fetch with no auth header and no retry-on-401 — used internally by
// reauthenticate() so refresh/guest-login calls can't recurse into themselves.
async function rawFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  const contentType = res.headers.get("content-type");
  const body = isJsonContentType(contentType) ? await res.json() : await res.text();

  if (!res.ok) {
    throw new ApiError(res.status, body);
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
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...init.headers,
    },
  });

  const contentType = res.headers.get("content-type");
  const body = isJsonContentType(contentType) ? await res.json() : await res.text();

  if (res.status === 401 && !skipAuthRetry) {
    const newAccessToken = await reauthenticate();
    if (newAccessToken) {
      return apiFetch<T>(path, { ...options, skipAuthRetry: true });
    }
  }

  if (!res.ok) {
    throw new ApiError(res.status, body);
  }

  return body as T;
}

export const api = {
  get: <T>(path: string, options?: RequestInit) => apiFetch<T>(path, { ...options, method: "GET" }),
  post: <T>(path: string, data?: unknown, options?: RequestInit) =>
    apiFetch<T>(path, { ...options, method: "POST", body: data ? JSON.stringify(data) : undefined }),
  put: <T>(path: string, data?: unknown, options?: RequestInit) =>
    apiFetch<T>(path, { ...options, method: "PUT", body: data ? JSON.stringify(data) : undefined }),
  patch: <T>(path: string, data?: unknown, options?: RequestInit) =>
    apiFetch<T>(path, { ...options, method: "PATCH", body: data ? JSON.stringify(data) : undefined }),
  del: <T>(path: string, options?: RequestInit) => apiFetch<T>(path, { ...options, method: "DELETE" }),
  // Multipart upload — apiFetch detects the FormData body and omits
  // Content-Type so the browser can set its own boundary.
  postForm: <T>(path: string, formData: FormData, options?: RequestInit) =>
    apiFetch<T>(path, { ...options, method: "POST", body: formData }),
};
