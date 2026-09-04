# OAuth sign-in + guest-login retirement + anonymous QR upload Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement three backend changes documented in `docs/integration guides/oauth-social-login-fe-guide.md` and `docs/integration guides/invite-redemption-and-anonymous-upload-fe-changelog.md`: (1) Google/Apple OAuth sign-in, (2) retirement of `POST /api/auth/guest-login` in favor of an optional `inviteToken` on register/login/oauth, and (3) fully anonymous `MEDIA_UPLOAD` QR codes via two new public upload endpoints.

**Architecture:** All three land together because they touch the same auth surface. The BFF pattern already used for `login`/`register` (`app/api/auth/*/route.ts` → `springAuth.ts` → Spring, httpOnly cookies, `AuthProvider` context) is extended with a fourth route for OAuth and stripped of everything guest-related (cookie, BFF route, `proxy.ts`/`session` refresh branch, provider method). `inviteToken` becomes a plain optional field alongside `email`/`password`/`idToken` on the three auth calls. The QR anonymous-upload flow needs no auth at all — it's a new public `postForm` on `lib/api/client.ts` hitting two new `/api/qr/{token}/media[/batch]` endpoints, wired into a new component split out of `QrCodeLandingBoundary`. Per the confirmed scope: redemption confirmation uses the "redirect and let the event page's own membership check handle it" strategy (no explicit post-auth membership call), and OAuth client IDs come from `NEXT_PUBLIC_OAUTH_GOOGLE_CLIENT_ID` / `NEXT_PUBLIC_OAUTH_APPLE_CLIENT_ID`.

**Tech Stack:** Next.js App Router, React 19, TypeScript, `next-intl`, TanStack Query, Google Identity Services (`accounts.google.com/gsi/client`), Sign in with Apple JS (`appleid.cdn-apple.com`). No new dependencies — both SDKs load via `<script>` tag, no npm package. This repo's Vitest setup already exists (`vitest.config.ts`); no test infra task needed. UI changes are verified manually in the browser per this repo's convention (no component/page tests exist elsewhere in the repo — only pure `lib/`/`hooks/` logic is unit-tested).

---

## Task 1: Error codes + i18n for the three new backend error codes

**Files:**
- Modify: `lib/api/errors.ts`
- Modify: `lib/api/errorMessageKeys.ts`
- Modify: `messages/en.json`
- Modify: `messages/el.json`

- [ ] **Step 1: Add the three new numeric codes to `ERROR_CODES`**

In `lib/api/errors.ts`, add to the `ERROR_CODES` object (after `ACCOUNT_NOT_ACTIVE: 1003,`):

```ts
    OAUTH_TOKEN_INVALID: 1004,
    OAUTH_EMAIL_REQUIRED: 3027,
```

And after `QR_LINK_NOT_FOUND: 2004,`:

```ts
    QR_LINK_NOT_AVAILABLE: 2005,
```

- [ ] **Step 2: Add message keys**

In `lib/api/errorMessageKeys.ts`, add three new members to the `ApiErrorMessageKey` union (keep alphabetical placement consistent with the existing list — exact position doesn't matter, TypeScript only cares that they exist):

```ts
    | 'oauthTokenInvalid'
    | 'oauthEmailRequired'
    | 'qrLinkNotAvailable'
```

Then add to `API_ERROR_MESSAGE_KEYS`:

```ts
    [ERROR_CODES.OAUTH_TOKEN_INVALID]: 'oauthTokenInvalid',
    [ERROR_CODES.OAUTH_EMAIL_REQUIRED]: 'oauthEmailRequired',
    [ERROR_CODES.QR_LINK_NOT_AVAILABLE]: 'qrLinkNotAvailable',
```

- [ ] **Step 3: Add the English copy**

In `messages/en.json`, inside the `ApiErrors` object, add:

```json
"oauthTokenInvalid": "Something went wrong signing you in — please try again.",
"oauthEmailRequired": "Please try signing in again.",
"qrLinkNotAvailable": "This code can't be used right now. Ask your host for a new one."
```

- [ ] **Step 4: Add the Greek copy**

Open `messages/el.json`, find the `ApiErrors` object, and add the same three keys with Greek translations matching the tone of the neighboring entries (e.g. `invitationExhausted`, `qrLinkNotFound`) in that file. Read a few neighboring values first so the phrasing matches the existing register.

- [ ] **Step 5: Verify the app still type-checks**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 6: Commit**

```bash
git add lib/api/errors.ts lib/api/errorMessageKeys.ts messages/en.json messages/el.json
git commit -m "$(cat <<'EOF'
Add error codes for OAuth and anonymous QR upload

OAUTH_TOKEN_INVALID (1004), OAUTH_EMAIL_REQUIRED (3027), and
QR_LINK_NOT_AVAILABLE (2005) are new per the OAuth sign-in guide and
the guest-login retirement changelog. Wired through the existing
getApiErrorMessageKey/useApiErrorMessage path so no call site needs
special-case handling.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Types — `inviteToken` on auth requests, `OAuthLoginRequestDto`, `anonymousUploaderName`

**Files:**
- Modify: `lib/api/types.ts`

- [ ] **Step 1: Add `inviteToken` to `RegisterRequestDto` and `LoginRequestDto`, add `OAuthLoginRequestDto`, remove `GuestLoginRequestDto`**

Replace (around line 298-320):

```ts
export interface RegisterRequestDto {
    email: string;
    password: string;
}

export interface LoginRequestDto {
    email: string;
    password: string;
}

export interface RefreshRequestDto {
    refreshToken: string;
}

export interface LogoutRequestDto {
    refreshToken: string;
}

export interface GuestLoginRequestDto {
    inviteToken: string;
    displayName: string;
    guestKey?: string;
}
```

with:

```ts
export interface RegisterRequestDto {
    email: string;
    password: string;
    inviteToken?: string;
}

export interface LoginRequestDto {
    email: string;
    password: string;
    inviteToken?: string;
}

export type OAuthProviderName = 'GOOGLE' | 'APPLE';

export interface OAuthLoginRequestDto {
    idToken: string;
    inviteToken?: string;
}

export interface RefreshRequestDto {
    refreshToken: string;
}

export interface LogoutRequestDto {
    refreshToken: string;
}
```

(`displayName` was register-only in the old `RegisterRequestDto` shown here — check the actual current file content before pasting; the register BFF route forwards whatever body it's given straight to Spring, so if `displayName` is already a field on `RegisterRequestDto` in the file, keep it and only add `inviteToken` alongside it.)

- [ ] **Step 2: Add `anonymousUploaderName` to `MediaResponseDto`**

In the `MediaResponseDto` interface (around line 1097), add a field:

```ts
    anonymousUploaderName: string | null;
```

Place it next to `uploaderMemberId: string | null;` since the two are mutually exclusive per the changelog.

- [ ] **Step 3: Verify**

Run: `npx tsc --noEmit`
Expected: errors at every remaining `GuestLoginRequestDto` and `guestLogin` reference — that's expected, they get fixed in later tasks. Confirm the errors are exactly in the files this plan still needs to touch (`lib/auth/springAuth.ts`, `app/api/auth/guest-login/route.ts`, `lib/api/authClient.ts`, `providers/AuthProvider.tsx`, `proxy.ts`, `app/api/auth/session/route.ts`, `app/invite/[token]/InviteOnboardingBoundary.tsx`, `app/q/[token]/QrCodeLandingBoundary.tsx`) and nowhere else.

- [ ] **Step 4: Commit**

```bash
git add lib/api/types.ts
git commit -m "$(cat <<'EOF'
Add inviteToken/OAuth request types, drop GuestLoginRequestDto

Prep for guest-login retirement: RegisterRequestDto/LoginRequestDto
gain an optional inviteToken, OAuthLoginRequestDto is new for
POST /api/auth/oauth/{provider}, and MediaResponseDto gains
anonymousUploaderName. Downstream call sites are fixed in later
commits on this branch — tsc is expected to be red until then.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Endpoints — add oauth + QR media upload, remove guestLogin

**Files:**
- Modify: `lib/api/endpoints.ts`

- [ ] **Step 1: Replace the `auth` group's `guestLogin` entry**

Replace:

```ts
    auth: {
        register: '/api/auth/register',
        login: '/api/auth/login',
        refresh: '/api/auth/refresh',
        logout: '/api/auth/logout',
        guestLogin: '/api/auth/guest-login',
        // Not a Spring route — same path served locally by this Next.js app's
        // own route handler, which reads httpOnly cookies to (re)derive a
        // session. See lib/auth/authCookies.ts.
        session: '/api/auth/session',
    },
```

with:

```ts
    auth: {
        register: '/api/auth/register',
        login: '/api/auth/login',
        refresh: '/api/auth/refresh',
        logout: '/api/auth/logout',
        oauth: (provider: 'GOOGLE' | 'APPLE') => `/api/auth/oauth/${provider}`,
        // Not a Spring route — same path served locally by this Next.js app's
        // own route handler, which reads httpOnly cookies to (re)derive a
        // session. See lib/auth/authCookies.ts.
        session: '/api/auth/session',
    },
```

- [ ] **Step 2: Add the two anonymous QR media upload endpoints**

In the `qrLinks` group, add two entries next to `resolve`:

```ts
    qrLinks: {
        byId: (id: string) => `/api/qr-links/${id}`,
        revoke: (id: string) => `/api/qr-links/${id}/revoke`,
        resolve: (token: string) => `/api/qr/${token}`,
        media: (token: string) => `/api/qr/${token}/media`,
        mediaBatch: (token: string) => `/api/qr/${token}/media/batch`,
    },
```

- [ ] **Step 3: Commit**

```bash
git add lib/api/endpoints.ts
git commit -m "$(cat <<'EOF'
Add oauth + anonymous QR media upload endpoints, drop guest-login

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: `springAuth.ts` — replace `guestLogin` with `oauth`

**Files:**
- Modify: `lib/auth/springAuth.ts`

- [ ] **Step 1: Replace the `guestLogin` export**

Replace:

```ts
export const springAuth = {
    register: (input: { email: string; password: string }) => springAuthFetch(endpoints.auth.register, input),
    login: (input: { email: string; password: string }) => springAuthFetch(endpoints.auth.login, input),
    guestLogin: (input: { inviteToken: string; displayName: string; guestKey?: string }) => springAuthFetch(endpoints.auth.guestLogin, input),
    refresh: (refreshToken: string) => springAuthFetch(endpoints.auth.refresh, { refreshToken }),
    logout: (refreshToken: string) => springAuthFetch(endpoints.auth.logout, { refreshToken }),
};
```

with (check the actual current signature of `register` first — it may already carry `displayName`/`inviteToken`-shaped input; keep it consistent with whatever `RegisterRequestDto` ended up as in Task 2, and just add `oauth`):

```ts
export const springAuth = {
    register: (input: { email: string; password: string; displayName: string; inviteToken?: string }) =>
        springAuthFetch(endpoints.auth.register, input),
    login: (input: { email: string; password: string; inviteToken?: string }) => springAuthFetch(endpoints.auth.login, input),
    oauth: (provider: 'GOOGLE' | 'APPLE', input: { idToken: string; inviteToken?: string }) =>
        springAuthFetch(endpoints.auth.oauth(provider), input),
    refresh: (refreshToken: string) => springAuthFetch(endpoints.auth.refresh, { refreshToken }),
    logout: (refreshToken: string) => springAuthFetch(endpoints.auth.logout, { refreshToken }),
};
```

- [ ] **Step 2: Commit**

```bash
git add lib/auth/springAuth.ts
git commit -m "$(cat <<'EOF'
springAuth: replace guestLogin with oauth

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: `authCookies.ts` — remove the guest cookie

**Files:**
- Modify: `lib/auth/authCookies.ts`

- [ ] **Step 1: Remove the `guest` cookie name, the guest max-age, and the encode/decode helpers**

Replace the whole file's guest-related exports. The new file:

```ts
// Server-only cookie contract shared by the /api/auth/* route handlers and
// middleware.ts. Everything here is httpOnly — none of it is meant to be
// readable by client JS; that's the whole point of moving off
// sessionStorage/localStorage (see lib/auth/tokenStore.ts).

export const AUTH_COOKIES = {
    // Current access token. Short-lived, mirrors the same lifetime Spring
    // issues it with, so the browser stops sending it once stale — that's
    // what lets middleware tell "needs a refresh" apart from "still fresh"
    // without decoding anything.
    accessToken: 'storywall_at',
    // Registered-user refresh token. No maxAge (session cookie) to match the
    // previous sessionStorage scoping — cleared when the browser closes.
    refreshToken: 'storywall_rt',
} as const;

// Server Components can't read/refresh cookies themselves (that's restricted
// to Route Handlers/Server Actions), so middleware.ts does the refresh-and-
// rotate work up front and hands the result down as a plain request header —
// see app/(app)/(event)/layout.tsx, which reads this to prefetch server-side.
export const ACCESS_TOKEN_HEADER = 'x-storywall-access-token';

export const ACCESS_TOKEN_MAX_AGE_SECONDS = 15 * 60;

export function baseCookieOptions() {
    return {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax' as const,
        path: '/',
    };
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/auth/authCookies.ts
git commit -m "$(cat <<'EOF'
Remove guest cookie machinery

There is no account-free way to join an event anymore, so the
storywall_guest cookie and its GUEST_ACCESS_TOKEN_MAX_AGE_SECONDS /
encode/decodeGuestCookie helpers have nothing left to serve.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: `proxy.ts` + `session/route.ts` — remove the guest refresh branch

**Files:**
- Modify: `proxy.ts`
- Modify: `app/api/auth/session/route.ts`

- [ ] **Step 1: Simplify `proxy.ts`'s `refreshSession`**

Replace the whole function and its imports:

```ts
import { NextRequest, NextResponse } from 'next/server';

import { ACCESS_TOKEN_HEADER, ACCESS_TOKEN_MAX_AGE_SECONDS, AUTH_COOKIES, baseCookieOptions } from '@/lib/auth/authCookies';
import { springAuth } from '@/lib/auth/springAuth';
import { routes } from '@/lib/routes';

// Explicit allowlist, not a denylist: every prefix listed here requires a
// valid session, and everything else passes through untouched. A new
// protected route has to be added here deliberately rather than relying on
// an exclusion pattern that could silently leave a public route ungated —
// or, worse, gate one that was meant to stay public.
const PROTECTED_PREFIXES = ['/admin', '/feed', '/notifications', '/profile', '/event-not-found', '/post/'];

function isProtectedPath(pathname: string): boolean {
    if (PROTECTED_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(prefix))) return true;
    // /events/[eventId]/... (checkout, settings) needs a session; /events/new
    // has its own client-side gate and must not match this prefix.
    return pathname.startsWith('/events/') && !pathname.startsWith('/events/new');
}

interface CookieWrite {
    name: string;
    value: string;
    options: ReturnType<typeof baseCookieOptions> & { maxAge?: number };
}

async function refreshSession(request: NextRequest): Promise<{ accessToken: string; cookies: CookieWrite[] } | null> {
    const refreshToken = request.cookies.get(AUTH_COOKIES.refreshToken)?.value;
    if (!refreshToken) return null;

    try {
        const auth = await springAuth.refresh(refreshToken);
        const cookies: CookieWrite[] = [
            {
                name: AUTH_COOKIES.accessToken,
                value: auth.accessToken,
                options: { ...baseCookieOptions(), maxAge: ACCESS_TOKEN_MAX_AGE_SECONDS },
            },
        ];
        if (auth.refreshToken) {
            cookies.push({ name: AUTH_COOKIES.refreshToken, value: auth.refreshToken, options: baseCookieOptions() });
        }
        return { accessToken: auth.accessToken, cookies };
    } catch {
        return null;
    }
}

export async function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl;
    if (!isProtectedPath(pathname)) return NextResponse.next();

    const existingToken = request.cookies.get(AUTH_COOKIES.accessToken)?.value ?? null;
    const refreshed = existingToken ? null : await refreshSession(request);
    const accessToken = existingToken ?? refreshed?.accessToken ?? null;

    if (!accessToken) {
        const redirect = NextResponse.redirect(new URL(routes.login, request.url));
        redirect.cookies.delete(AUTH_COOKIES.accessToken);
        redirect.cookies.delete(AUTH_COOKIES.refreshToken);
        return redirect;
    }

    const requestHeaders = new Headers(request.headers);
    requestHeaders.set(ACCESS_TOKEN_HEADER, accessToken);
    const response = NextResponse.next({ request: { headers: requestHeaders } });

    for (const cookie of refreshed?.cookies ?? []) {
        response.cookies.set(cookie.name, cookie.value, cookie.options);
    }

    return response;
}

export const config = {
    matcher: ['/((?!_next/static|_next/image|favicon.ico|api).*)'],
};
```

- [ ] **Step 2: Simplify `app/api/auth/session/route.ts`**

Replace the whole file:

```ts
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

import { ACCESS_TOKEN_MAX_AGE_SECONDS, AUTH_COOKIES, baseCookieOptions } from '@/lib/auth/authCookies';
import { toSessionDto } from '@/lib/auth/authRouteHelpers';
import { springAuth } from '@/lib/auth/springAuth';

function clearAuthCookies(cookieStore: Awaited<ReturnType<typeof cookies>>) {
    cookieStore.delete(AUTH_COOKIES.accessToken);
    cookieStore.delete(AUTH_COOKIES.refreshToken);
}

export async function GET() {
    const cookieStore = await cookies();
    const refreshToken = cookieStore.get(AUTH_COOKIES.refreshToken)?.value;

    if (!refreshToken) {
        clearAuthCookies(cookieStore);
        return NextResponse.json(null, { status: 401 });
    }

    try {
        const auth = await springAuth.refresh(refreshToken);

        cookieStore.set(AUTH_COOKIES.accessToken, auth.accessToken, { ...baseCookieOptions(), maxAge: ACCESS_TOKEN_MAX_AGE_SECONDS });
        if (auth.refreshToken) cookieStore.set(AUTH_COOKIES.refreshToken, auth.refreshToken, baseCookieOptions());

        return NextResponse.json(toSessionDto(auth));
    } catch {
        clearAuthCookies(cookieStore);
        return NextResponse.json(null, { status: 401 });
    }
}
```

- [ ] **Step 3: Commit**

```bash
git add proxy.ts "app/api/auth/session/route.ts"
git commit -m "$(cat <<'EOF'
Drop the guest branch from session refresh

Only registered/OAuth accounts exist now, so proxy.ts and
/api/auth/session only ever have a refresh token to work with.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 7: Delete `app/api/auth/guest-login/route.ts`, add `app/api/auth/oauth/[provider]/route.ts`

**Files:**
- Delete: `app/api/auth/guest-login/route.ts`
- Create: `app/api/auth/oauth/[provider]/route.ts`

- [ ] **Step 1: Delete the guest-login route directory**

```bash
git rm -r "app/api/auth/guest-login"
```

- [ ] **Step 2: Create the OAuth BFF route**

`app/api/auth/oauth/[provider]/route.ts`:

```ts
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

import { ACCESS_TOKEN_MAX_AGE_SECONDS, AUTH_COOKIES, baseCookieOptions } from '@/lib/auth/authCookies';
import { authErrorResponse, toSessionDto } from '@/lib/auth/authRouteHelpers';
import { springAuth } from '@/lib/auth/springAuth';

export async function POST(request: Request, { params }: { params: Promise<{ provider: string }> }) {
    const { provider } = await params;
    if (provider !== 'GOOGLE' && provider !== 'APPLE') {
        return NextResponse.json(null, { status: 400 });
    }

    const input = await request.json();

    try {
        const auth = await springAuth.oauth(provider, input);
        const cookieStore = await cookies();

        cookieStore.set(AUTH_COOKIES.accessToken, auth.accessToken, { ...baseCookieOptions(), maxAge: ACCESS_TOKEN_MAX_AGE_SECONDS });
        if (auth.refreshToken) cookieStore.set(AUTH_COOKIES.refreshToken, auth.refreshToken, baseCookieOptions());

        return NextResponse.json(toSessionDto(auth));
    } catch (error) {
        return authErrorResponse(error);
    }
}
```

This mirrors `app/api/auth/login/route.ts` exactly, just with the provider taken from the URL segment and validated before hitting Spring (matches the backend's own `400` for a bad `{provider}` segment, per the OAuth guide's error table).

- [ ] **Step 3: Verify the route compiles**

Run: `npx tsc --noEmit`
Expected: no errors from this file.

- [ ] **Step 4: Commit**

```bash
git add "app/api/auth/oauth" "app/api/auth/guest-login"
git commit -m "$(cat <<'EOF'
Replace /api/auth/guest-login BFF route with /api/auth/oauth/[provider]

Mirrors the existing login/register route handler pattern.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 8: `authClient.ts` + `AuthProvider.tsx` + `useAuth` — swap `guestLogin` for `oauth`, thread `inviteToken`

**Files:**
- Modify: `lib/api/authClient.ts`
- Modify: `providers/AuthProvider.tsx`

- [ ] **Step 1: Update `authClient.ts`**

Replace:

```ts
export const authClient = {
    register: (input: { email: string; password: string; displayName: string }) =>
        authRequest<AuthSessionDto>(endpoints.auth.register, { method: 'POST', body: JSON.stringify(input) }),

    login: (input: { email: string; password: string }) =>
        authRequest<AuthSessionDto>(endpoints.auth.login, { method: 'POST', body: JSON.stringify(input) }),

    guestLogin: (input: { inviteToken: string; displayName: string }) =>
        authRequest<AuthSessionDto>(endpoints.auth.guestLogin, { method: 'POST', body: JSON.stringify(input) }),
```

with:

```ts
export const authClient = {
    register: (input: { email: string; password: string; displayName: string; inviteToken?: string }) =>
        authRequest<AuthSessionDto>(endpoints.auth.register, { method: 'POST', body: JSON.stringify(input) }),

    login: (input: { email: string; password: string; inviteToken?: string }) =>
        authRequest<AuthSessionDto>(endpoints.auth.login, { method: 'POST', body: JSON.stringify(input) }),

    oauth: (provider: 'GOOGLE' | 'APPLE', input: { idToken: string; inviteToken?: string }) =>
        authRequest<AuthSessionDto>(endpoints.auth.oauth(provider), { method: 'POST', body: JSON.stringify(input) }),
```

(keep `session` and `logout` as they are).

- [ ] **Step 2: Update `AuthProvider.tsx`**

Replace the `guestLogin` callback and its two references in the interface/value:

```ts
    guestLogin: (input: { inviteToken: string; displayName: string }) => Promise<AuthSessionDto>;
```
→
```ts
    register: (input: { email: string; password: string; displayName: string; inviteToken?: string }) => Promise<AuthSessionDto>;
    login: (input: { email: string; password: string; inviteToken?: string }) => Promise<AuthSessionDto>;
    oauth: (provider: 'GOOGLE' | 'APPLE', input: { idToken: string; inviteToken?: string }) => Promise<AuthSessionDto>;
```

(update the existing `register`/`login` interface lines' signatures in place rather than duplicating — they're already in `AuthContextValue`, just widen their input types to accept the optional `inviteToken`.)

Replace the `guestLogin` implementation:

```ts
    const guestLogin = useCallback(async (input: { inviteToken: string; displayName: string }) => {
        const session = await authClient.guestLogin(input);
        setSession(session);
        return session;
    }, []);
```

with:

```ts
    const oauth = useCallback(async (provider: 'GOOGLE' | 'APPLE', input: { idToken: string; inviteToken?: string }) => {
        const session = await authClient.oauth(provider, input);
        setSession(session);
        return session;
    }, []);
```

And update the `register`/`login` callbacks' parameter types to match the widened interface (the bodies are unchanged — they already just forward `input` to `authClient`):

```ts
    const register = useCallback(async (input: { email: string; password: string; displayName: string; inviteToken?: string }) => {
        const session = await authClient.register(input);
        setSession(session);
        return session;
    }, []);

    const login = useCallback(async (input: { email: string; password: string; inviteToken?: string }) => {
        const session = await authClient.login(input);
        setSession(session);
        return session;
    }, []);
```

Finally update the two `useMemo` dependency arrays / object literals that reference `guestLogin` — replace `guestLogin` with `oauth` in both the `value = useMemo(() => ({ ... guestLogin ... }), [...guestLogin...])` object and its dependency array.

- [ ] **Step 3: Verify**

Run: `npx tsc --noEmit`
Expected: errors now only in `app/invite/[token]/InviteOnboardingBoundary.tsx`, `app/q/[token]/QrCodeLandingBoundary.tsx`, `app/login/page.tsx`, `app/register/page.tsx` (all fixed in later tasks).

- [ ] **Step 4: Commit**

```bash
git add lib/api/authClient.ts providers/AuthProvider.tsx
git commit -m "$(cat <<'EOF'
AuthProvider: replace guestLogin with oauth, thread inviteToken through register/login

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 9: `lib/api/client.ts` — add `publicPostForm` for anonymous QR uploads

**Files:**
- Modify: `lib/api/client.ts`
- Test: `lib/api/client.test.ts`

The two new QR upload endpoints are public multipart POSTs — no `Authorization` header, no 401-retry loop. The existing `api.postForm` goes through `apiFetch`, which *would* still work (no token means no `Authorization` header gets added, and a 401 would trigger a pointless `reauthenticate()` call before giving up) but that reauthenticate attempt is wasted work and muddies intent. Add an explicit public variant, matching the existing `publicGet`/`rawFetch` split.

- [ ] **Step 1: Write the failing test**

`lib/api/client.test.ts`:

```ts
import { afterEach, describe, expect, it, vi } from 'vitest';

import { api, ApiError } from '@/lib/api/client';

describe('api.publicPostForm', () => {
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('posts FormData with no Authorization header and returns the parsed JSON body', async () => {
        const fetchMock = vi.fn().mockResolvedValue(
            new Response(JSON.stringify({ id: 'media-1' }), { status: 201, headers: { 'content-type': 'application/json' } })
        );
        vi.stubGlobal('fetch', fetchMock);

        const formData = new FormData();
        formData.append('file', new Blob(['x']), 'x.jpg');

        const result = await api.publicPostForm<{ id: string }>('/api/qr/tok123/media', formData);

        expect(result).toEqual({ id: 'media-1' });
        const [, init] = fetchMock.mock.calls[0];
        expect(init.headers?.Authorization).toBeUndefined();
        expect(init.body).toBe(formData);
    });

    it('throws ApiError with the parsed problem body on failure', async () => {
        const fetchMock = vi.fn().mockResolvedValue(
            new Response(JSON.stringify({ errorCode: 2005, detail: 'not available' }), {
                status: 409,
                headers: { 'content-type': 'application/problem+json' },
            })
        );
        vi.stubGlobal('fetch', fetchMock);

        await expect(api.publicPostForm('/api/qr/tok123/media', new FormData())).rejects.toBeInstanceOf(ApiError);
    });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npm test -- lib/api/client.test.ts`
Expected: FAIL — `api.publicPostForm is not a function`.

- [ ] **Step 3: Implement `publicPostForm`**

In `lib/api/client.ts`, add a form-data variant of `rawFetch` and expose it on `api`. Add this function near `rawFetch`:

```ts
// Public multipart POST — no auth header, no 401 retry. Used by the two
// anonymous QR media-upload endpoints, which take the scanned QR token
// itself as the credential instead of a bearer token.
async function rawPostForm<T>(path: string, formData: FormData, options: RequestInit = {}): Promise<T> {
    const res = await fetch(`${API_BASE_URL}${path}`, {
        ...options,
        method: 'POST',
        body: formData,
    });

    const body = await parseResponseBody(res);

    if (!res.ok) {
        throw new ApiError(res.status, body, undefined, res.headers.get('retry-after'));
    }

    return body as T;
}
```

Then add it to the `api` export:

```ts
    publicPostForm: <T>(path: string, formData: FormData, options?: RequestInit) => rawPostForm<T>(path, formData, options),
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- lib/api/client.test.ts`
Expected: PASS, 2 tests.

- [ ] **Step 5: Commit**

```bash
git add lib/api/client.ts lib/api/client.test.ts
git commit -m "$(cat <<'EOF'
Add api.publicPostForm for anonymous QR media uploads

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 10: `hooks/useQrMediaUpload.ts` — anonymous upload mutations

**Files:**
- Create: `hooks/useQrMediaUpload.ts`

- [ ] **Step 1: Write the hook**

`hooks/useQrMediaUpload.ts`:

```ts
import { useMutation } from '@tanstack/react-query';

import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { MediaBatchUploadResponseDto, MediaResponseDto } from '@/lib/api/types';

interface UploadQrMediaInput {
    token: string;
    file: File;
    uploaderName?: string;
}

// POST /api/qr/{token}/media — fully public, no account, no join. The
// scanned QR token is the credential. See
// docs/integration guides/invite-redemption-and-anonymous-upload-fe-changelog.md §2.
export function useUploadQrMedia() {
    return useMutation({
        mutationFn: ({ token, file, uploaderName }: UploadQrMediaInput) => {
            const formData = new FormData();
            formData.append('file', file);
            if (uploaderName) formData.append('uploaderName', uploaderName);
            return api.publicPostForm<MediaResponseDto>(endpoints.qrLinks.media(token), formData);
        },
    });
}

interface UploadQrMediaBatchInput {
    token: string;
    files: File[];
    uploaderName?: string;
}

// POST /api/qr/{token}/media/batch — same anonymous contract, multiple files.
// Always resolves 200; per-file outcomes are in created[]/failed[].
export function useUploadQrMediaBatch() {
    return useMutation({
        mutationFn: ({ token, files, uploaderName }: UploadQrMediaBatchInput) => {
            const formData = new FormData();
            files.forEach((file) => formData.append('files', file));
            if (uploaderName) formData.append('uploaderName', uploaderName);
            return api.publicPostForm<MediaBatchUploadResponseDto>(endpoints.qrLinks.mediaBatch(token), formData);
        },
    });
}
```

This has no pure logic to unit test beyond what Task 9 already covers on `publicPostForm` — it's a thin TanStack Query wrapper, consistent with every other mutation hook in `hooks/useMedia.ts` (none of which have tests either).

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit`
Expected: no errors from this file.

- [ ] **Step 3: Commit**

```bash
git add hooks/useQrMediaUpload.ts
git commit -m "$(cat <<'EOF'
Add useUploadQrMedia/useUploadQrMediaBatch for anonymous QR uploads

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 11: OAuth SDK loader + sign-in buttons

**Files:**
- Create: `hooks/useGoogleIdentitySdk.ts`
- Create: `hooks/useAppleIdSdk.ts`
- Create: `components/auth/OAuthButtons.tsx`
- Modify: `.env.example`

- [ ] **Step 1: Document the two new env vars**

Add to `.env.example` (after the existing `NEXT_PUBLIC_API_BASE_URL` line):

```
NEXT_PUBLIC_OAUTH_GOOGLE_CLIENT_ID=
NEXT_PUBLIC_OAUTH_APPLE_CLIENT_ID=
```

Add the same two (with real values) to your local `.env.local` — get them from whoever owns the Google Cloud Console / Apple Developer configuration; they must match the backend's `OAUTH_GOOGLE_CLIENT_ID` / `OAUTH_APPLE_CLIENT_ID`. Until real values are set, the buttons render but sign-in will fail — that's fine for reviewing the rest of this plan, just flag it before this ships.

- [ ] **Step 2: Google Identity Services loader hook**

`hooks/useGoogleIdentitySdk.ts`:

```ts
import { useEffect, useState } from 'react';

const SCRIPT_SRC = 'https://accounts.google.com/gsi/client';

declare global {
    interface Window {
        google?: {
            accounts: {
                id: {
                    initialize: (config: { client_id: string; callback: (response: { credential: string }) => void }) => void;
                    renderButton: (parent: HTMLElement, options: { theme: string; size: string; width?: number }) => void;
                };
            };
        };
    }
}

// Loads Google's own unversioned gsi/client script once per page (Google
// rotates it without notice — no SRI hash is possible, see the OAuth guide).
// Returns whether `window.google.accounts.id` is ready to call.
export function useGoogleIdentitySdk(): boolean {
    const [ready, setReady] = useState(() => typeof window !== 'undefined' && Boolean(window.google?.accounts?.id));

    useEffect(() => {
        if (ready) return;
        if (typeof document === 'undefined') return;

        const existing = document.querySelector<HTMLScriptElement>(`script[src="${SCRIPT_SRC}"]`);
        if (existing) {
            existing.addEventListener('load', () => setReady(true), { once: true });
            return;
        }

        const script = document.createElement('script');
        script.src = SCRIPT_SRC;
        script.async = true;
        script.defer = true;
        script.addEventListener('load', () => setReady(true), { once: true });
        document.head.appendChild(script);
    }, [ready]);

    return ready;
}
```

- [ ] **Step 3: Sign in with Apple JS loader hook**

`hooks/useAppleIdSdk.ts`:

```ts
import { useEffect, useState } from 'react';

const SCRIPT_SRC = 'https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js';

declare global {
    interface Window {
        AppleID?: {
            auth: {
                init: (config: { clientId: string; scope: string; redirectURI: string; usePopup: boolean }) => void;
                signIn: () => Promise<{ authorization: { id_token: string } }>;
            };
        };
    }
}

// Same loading contract as useGoogleIdentitySdk — Apple serves this
// unversioned too, no SRI hash. See the OAuth guide's Apple section.
export function useAppleIdSdk(): boolean {
    const [ready, setReady] = useState(() => typeof window !== 'undefined' && Boolean(window.AppleID?.auth));

    useEffect(() => {
        if (ready) return;
        if (typeof document === 'undefined') return;

        const existing = document.querySelector<HTMLScriptElement>(`script[src="${SCRIPT_SRC}"]`);
        if (existing) {
            existing.addEventListener('load', () => setReady(true), { once: true });
            return;
        }

        const script = document.createElement('script');
        script.src = SCRIPT_SRC;
        script.addEventListener('load', () => setReady(true), { once: true });
        document.head.appendChild(script);
    }, [ready]);

    return ready;
}
```

- [ ] **Step 4: `OAuthButtons` component**

This is the shared piece both `/login` and `/register` render. It takes the pending `inviteToken` (if any) and an `onSuccess`/`onError` pair so the two pages can each decide where to redirect and how to surface errors, matching how they already handle the password form.

`components/auth/OAuthButtons.tsx`:

```tsx
'use client';

import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useRef } from 'react';

import { useAppleIdSdk } from '@/hooks/useAppleIdSdk';
import { useGoogleIdentitySdk } from '@/hooks/useGoogleIdentitySdk';

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_OAUTH_GOOGLE_CLIENT_ID ?? '';
const APPLE_CLIENT_ID = process.env.NEXT_PUBLIC_OAUTH_APPLE_CLIENT_ID ?? '';

interface OAuthButtonsProps {
    inviteToken?: string | null;
    onSignIn: (provider: 'GOOGLE' | 'APPLE', idToken: string) => Promise<void>;
    onError: (error: unknown) => void;
}

export function OAuthButtons({ inviteToken, onSignIn, onError }: OAuthButtonsProps) {
    const t = useTranslations('OAuthButtons');
    const googleReady = useGoogleIdentitySdk();
    const appleReady = useAppleIdSdk();
    const googleButtonRef = useRef<HTMLDivElement>(null);
    // inviteToken changes shouldn't re-run SDK init, but the callback must
    // always see the latest value — a ref sidesteps re-initializing Google's
    // button (which it doesn't support cleanly) on every query-param change.
    const inviteTokenRef = useRef(inviteToken);
    inviteTokenRef.current = inviteToken;

    useEffect(() => {
        if (!googleReady || !GOOGLE_CLIENT_ID || !googleButtonRef.current) return;

        window.google!.accounts.id.initialize({
            client_id: GOOGLE_CLIENT_ID,
            callback: (response) => {
                void onSignIn('GOOGLE', response.credential).catch(onError);
            },
        });
        window.google!.accounts.id.renderButton(googleButtonRef.current, { theme: 'outline', size: 'large', width: 320 });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [googleReady]);

    const handleAppleClick = useCallback(async () => {
        if (!appleReady || !APPLE_CLIENT_ID) return;

        window.AppleID!.auth.init({
            clientId: APPLE_CLIENT_ID,
            scope: 'name email',
            redirectURI: typeof window !== 'undefined' ? `${window.location.origin}/auth/apple/callback` : '',
            usePopup: true,
        });

        try {
            const result = await window.AppleID!.auth.signIn();
            await onSignIn('APPLE', result.authorization.id_token);
        } catch (err) {
            onError(err);
        }
    }, [appleReady, onSignIn, onError]);

    return (
        <div className="flex flex-col gap-3">
            <div ref={googleButtonRef} className="flex justify-center" />
            <button
                type="button"
                onClick={handleAppleClick}
                disabled={!appleReady}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-full bg-black text-white text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-60 disabled:cursor-not-allowed"
            >
                {t('continueWithApple')}
            </button>
        </div>
    );
}
```

Note: `redirectURI` is only exercised by Apple's popup-fallback path (`usePopup: true` avoids a real redirect in the common case); it must be a URL registered in the Apple Developer "Sign in with Apple" configuration. Flag this to whoever owns that config — `/auth/apple/callback` doesn't need to be a real route in this app for the popup flow, but it does need to be *registered* with Apple or `AppleID.auth.init` will reject.

- [ ] **Step 5: Add `OAuthButtons` translation keys**

Add a new top-level section to `messages/en.json`:

```json
"OAuthButtons": {
    "continueWithApple": "Continue with Apple"
}
```

Add the equivalent to `messages/el.json`.

(Google's own `renderButton` draws its own localized "Sign in with Google" label — no key needed for it.)

- [ ] **Step 6: Verify**

Run: `npx tsc --noEmit`
Expected: no errors from these three new files.

- [ ] **Step 7: Commit**

```bash
git add hooks/useGoogleIdentitySdk.ts hooks/useAppleIdSdk.ts components/auth/OAuthButtons.tsx .env.example messages/en.json messages/el.json
git commit -m "$(cat <<'EOF'
Add Google/Apple OAuth SDK loaders and OAuthButtons component

Client IDs come from NEXT_PUBLIC_OAUTH_GOOGLE_CLIENT_ID /
NEXT_PUBLIC_OAUTH_APPLE_CLIENT_ID, matching the backend's
OAUTH_GOOGLE_CLIENT_ID / OAUTH_APPLE_CLIENT_ID.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 12: Wire `/login` and `/register` — OAuth buttons + `inviteToken` on the password form, drop the old accept-after-auth flow

**Files:**
- Modify: `app/login/page.tsx`
- Modify: `app/register/page.tsx`

Per the confirmed scope, redemption becomes silent-and-attached: `inviteToken` rides along on `login`/`register`/`oauth` itself, and the page just redirects afterward — the event page's own membership/access check is what tells a non-member apart from a member. This replaces the old two-step "login, then call accept, then branch on 5035/limit/expired" flow.

- [ ] **Step 1: Rewrite `app/login/page.tsx`**

```tsx
'use client';

import { ArrowRight, Eye, EyeOff, Loader2, Lock, Mail } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import React, { useCallback, useState } from 'react';

import { AuthLayout } from '@/components/auth/AuthLayout';
import { OAuthButtons } from '@/components/auth/OAuthButtons';
import { FormFieldLabel } from '@/components/ui/FormFieldLabel';
import { useApiErrorMessage } from '@/hooks/useApiErrorMessage';
import { useAuth } from '@/hooks/useAuth';
import { useAuthPageRedirect } from '@/hooks/useAuthPageRedirect';
import { routes } from '@/lib/routes';

export default function LoginPage() {
    const t = useTranslations('LoginPage');
    const router = useRouter();
    const searchParams = useSearchParams();
    const inviteToken = searchParams.get('invite');
    const passwordChanged = searchParams.get('passwordChanged') === '1';

    const { login, oauth } = useAuth();
    const { shouldRenderAuthPage } = useAuthPageRedirect();
    const toErrorMessage = useApiErrorMessage();

    const [showPw, setShowPw] = useState(false);
    const [email, setEmail] = useState(searchParams.get('email') ?? '');
    const [password, setPassword] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleEmailChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setEmail(e.target.value);
    }, []);

    const handlePasswordChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setPassword(e.target.value);
    }, []);

    const handleTogglePasswordVisibility = useCallback(() => {
        setShowPw((p) => !p);
    }, []);

    async function handleSubmit(e: React.SubmitEvent<HTMLFormElement>) {
        e.preventDefault();
        setError(null);
        setIsSubmitting(true);

        try {
            const auth = await login({ email, password, inviteToken: inviteToken ?? undefined });
            router.replace(auth.role === 'ADMIN' ? routes.admin : routes.feed);
        } catch (err) {
            setError(toErrorMessage(err));
        } finally {
            setIsSubmitting(false);
        }
    }

    const handleOAuthSignIn = useCallback(
        async (provider: 'GOOGLE' | 'APPLE', idToken: string) => {
            setError(null);
            const auth = await oauth(provider, { idToken, inviteToken: inviteToken ?? undefined });
            router.replace(auth.role === 'ADMIN' ? routes.admin : routes.feed);
        },
        [oauth, inviteToken, router]
    );

    const handleOAuthError = useCallback(
        (err: unknown) => {
            setError(toErrorMessage(err));
        },
        [toErrorMessage]
    );

    if (!shouldRenderAuthPage) {
        return <div className="min-h-screen bg-background" />;
    }

    return (
        <AuthLayout>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                {/* Status */}
                {passwordChanged && <p className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{t('passwordChanged')}</p>}

                {/* Email */}
                <FormFieldLabel label={t('fields.email')} required>
                    <div className="flex items-center gap-3 bg-surface-muted rounded-xl px-4 py-3 focus-within:ring-2 focus-within:ring-primary/30 transition">
                        <Mail className="w-4 h-4 text-ink-muted shrink-0" />
                        <input
                            type="email"
                            placeholder={t('placeholders.email')}
                            required
                            value={email}
                            onChange={handleEmailChange}
                            className="flex-1 bg-transparent text-sm text-ink placeholder:text-ink-faint outline-none"
                        />
                    </div>
                </FormFieldLabel>

                {/* Password */}
                <FormFieldLabel label={t('fields.password')} required>
                    <div className="flex items-center gap-3 bg-surface-muted rounded-xl px-4 py-3 focus-within:ring-2 focus-within:ring-primary/30 transition">
                        <Lock className="w-4 h-4 text-ink-muted shrink-0" />
                        <input
                            type={showPw ? 'text' : 'password'}
                            placeholder="••••••••"
                            required
                            minLength={8}
                            value={password}
                            onChange={handlePasswordChange}
                            className="flex-1 bg-transparent text-sm text-ink placeholder:text-ink-faint outline-none"
                        />
                        <button
                            type="button"
                            onClick={handleTogglePasswordVisibility}
                            aria-label={showPw ? t('hidePassword') : t('showPassword')}
                            className="text-ink-faint hover:text-ink-muted transition-colors"
                        >
                            {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                    </div>
                </FormFieldLabel>

                {/* Feedback */}
                {error && (
                    <p role="alert" className="text-xs text-center text-red-500 -mt-1">
                        {error}
                    </p>
                )}

                {/* Actions */}
                <button
                    type="submit"
                    disabled={isSubmitting}
                    className="mt-2 w-full flex items-center justify-center gap-2 py-3 rounded-full bg-gradient-brand text-white text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-60 disabled:cursor-not-allowed"
                >
                    {isSubmitting ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                        <>
                            {t('submit')}
                            <ArrowRight className="w-4 h-4" />
                        </>
                    )}
                </button>
            </form>

            {/* OAuth */}
            <div className="my-5 flex items-center gap-3 text-xs text-ink-faint">
                <span className="h-px flex-1 bg-surface-muted" />
                {t('orContinueWith')}
                <span className="h-px flex-1 bg-surface-muted" />
            </div>
            <OAuthButtons inviteToken={inviteToken} onSignIn={handleOAuthSignIn} onError={handleOAuthError} />

            <p className="text-xs text-center text-ink-muted mt-6">
                {t('noAccount')}{' '}
                <Link
                    href={inviteToken ? routes.auth.register({ invite: inviteToken }) : routes.register}
                    className="font-semibold text-ink hover:underline"
                >
                    {t('createAccountLink')}
                </Link>
            </p>
        </AuthLayout>
    );
}
```

- [ ] **Step 2: Rewrite `app/register/page.tsx`**

Same shape of change: attach `inviteToken` to `register`, add the `oauth`/`OAuthButtons` wiring, drop `joinEventAfterAuth`/`useAcceptEventInvitation`/`findNextPlan`/`useAppConfig` imports and usage entirely.

```tsx
'use client';

import { ArrowRight, Eye, EyeOff, Loader2, Lock, Mail, User } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import React, { ChangeEvent, useCallback, useState } from 'react';

import { AuthLayout } from '@/components/auth/AuthLayout';
import { OAuthButtons } from '@/components/auth/OAuthButtons';
import { FormFieldLabel } from '@/components/ui/FormFieldLabel';
import { useApiErrorMessage } from '@/hooks/useApiErrorMessage';
import { useAuth } from '@/hooks/useAuth';
import { useAuthPageRedirect } from '@/hooks/useAuthPageRedirect';
import { routes } from '@/lib/routes';

export default function RegisterPage() {
    const t = useTranslations('RegisterPage');
    const router = useRouter();
    const searchParams = useSearchParams();
    const inviteToken = searchParams.get('invite');

    const { register, oauth } = useAuth();
    const { shouldRenderAuthPage } = useAuthPageRedirect();
    const toErrorMessage = useApiErrorMessage();

    const [showPw, setShowPw] = useState(false);
    const [email, setEmail] = useState(searchParams.get('email') ?? '');
    const [displayName, setDisplayName] = useState(searchParams.get('displayName') ?? '');
    const [password, setPassword] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function handleSubmit(e: React.SubmitEvent<HTMLFormElement>) {
        e.preventDefault();
        setError(null);
        setIsSubmitting(true);

        try {
            const auth = await register({ email, password, displayName, inviteToken: inviteToken ?? undefined });
            router.replace(auth.role === 'ADMIN' ? routes.admin : routes.feed);
        } catch (err) {
            setError(toErrorMessage(err));
        } finally {
            setIsSubmitting(false);
        }
    }

    const handleOAuthSignIn = useCallback(
        async (provider: 'GOOGLE' | 'APPLE', idToken: string) => {
            setError(null);
            const auth = await oauth(provider, { idToken, inviteToken: inviteToken ?? undefined });
            router.replace(auth.role === 'ADMIN' ? routes.admin : routes.feed);
        },
        [oauth, inviteToken, router]
    );

    const handleOAuthError = useCallback(
        (err: unknown) => {
            setError(toErrorMessage(err));
        },
        [toErrorMessage]
    );

    const onEmailChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
        setEmail(e.target.value);
    }, []);

    const onPasswordChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
        setPassword(e.target.value);
    }, []);

    const onDisplayNameChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
        setDisplayName(e.target.value);
    }, []);

    const onTogglePasswordVisibility = useCallback(() => {
        setShowPw((p) => !p);
    }, []);

    if (!shouldRenderAuthPage) {
        return <div className="min-h-screen bg-background" />;
    }

    return (
        <AuthLayout>
            <h2 className="text-2xl font-bold text-ink mb-1">{t('title')}</h2>
            <p className="text-sm text-ink-muted mb-7">{t('subtitle')}</p>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <FormFieldLabel label={t('fields.fullName')} required>
                    <div className="flex items-center gap-3 bg-surface-muted rounded-xl px-4 py-3 focus-within:ring-2 focus-within:ring-primary/30 transition">
                        <User className="w-4 h-4 text-ink-muted shrink-0" />
                        <input
                            type="text"
                            placeholder={t('placeholders.fullName')}
                            required
                            className="flex-1 bg-transparent text-sm text-ink placeholder:text-ink-faint outline-none"
                            onChange={onDisplayNameChange}
                        />
                    </div>
                </FormFieldLabel>

                <FormFieldLabel label={t('fields.email')} required>
                    <div className="flex items-center gap-3 bg-surface-muted rounded-xl px-4 py-3 focus-within:ring-2 focus-within:ring-primary/30 transition">
                        <Mail className="w-4 h-4 text-ink-muted shrink-0" />
                        <input
                            type="email"
                            placeholder={t('placeholders.email')}
                            required
                            value={email}
                            onChange={onEmailChange}
                            className="flex-1 bg-transparent text-sm text-ink placeholder:text-ink-faint outline-none"
                        />
                    </div>
                </FormFieldLabel>

                <FormFieldLabel label={t('fields.password')} required>
                    <div className="flex items-center gap-3 bg-surface-muted rounded-xl px-4 py-3 focus-within:ring-2 focus-within:ring-primary/30 transition">
                        <Lock className="w-4 h-4 text-ink-muted shrink-0" />
                        <input
                            type={showPw ? 'text' : 'password'}
                            placeholder="••••••••"
                            required
                            minLength={8}
                            value={password}
                            onChange={onPasswordChange}
                            className="flex-1 bg-transparent text-sm text-ink placeholder:text-ink-faint outline-none"
                        />
                        <button
                            type="button"
                            onClick={onTogglePasswordVisibility}
                            aria-label={showPw ? t('hidePassword') : t('showPassword')}
                            className="text-ink-faint hover:text-ink-muted transition-colors"
                        >
                            {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                    </div>
                </FormFieldLabel>

                {error && (
                    <p role="alert" className="text-xs text-center text-red-500 -mt-1">
                        {error}
                    </p>
                )}

                <button
                    type="submit"
                    disabled={isSubmitting}
                    className="mt-2 w-full flex items-center justify-center gap-2 py-3 rounded-full bg-gradient-brand text-white text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-60 disabled:cursor-not-allowed"
                >
                    {isSubmitting ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                        <>
                            {t('submit')}
                            <ArrowRight className="w-4 h-4" />
                        </>
                    )}
                </button>
            </form>

            <div className="my-5 flex items-center gap-3 text-xs text-ink-faint">
                <span className="h-px flex-1 bg-surface-muted" />
                {t('orContinueWith')}
                <span className="h-px flex-1 bg-surface-muted" />
            </div>
            <OAuthButtons inviteToken={inviteToken} onSignIn={handleOAuthSignIn} onError={handleOAuthError} />

            <p className="text-xs text-center text-ink-muted mt-6">
                {t('haveAccount')}{' '}
                <Link
                    href={inviteToken ? routes.auth.login({ invite: inviteToken }) : routes.login}
                    className="font-semibold text-ink hover:underline"
                >
                    {t('signInLink')}
                </Link>
            </p>
        </AuthLayout>
    );
}
```

- [ ] **Step 3: Add the new `orContinueWith` key, remove the now-dead invite-error keys**

In `messages/en.json`, add `"orContinueWith": "Or continue with"` to both `LoginPage` and `RegisterPage`. Remove `expiredInvite`, `memberLimitExceeded`, `memberLimitExceededWithPlan`, `invitationExhausted` from both — they were rendered only by the deleted `joinEventAfterAuth` branches, and redemption failures are now silent by design. Apply the same two edits to `messages/el.json`.

- [ ] **Step 4: Verify**

Run: `npx tsc --noEmit`
Expected: no errors in these two files. `lib/planTiers.ts`'s `findNextPlan` and `useAppConfig` may now be unused elsewhere — check with a repo-wide grep before touching either; leave them if any other call site remains (`findNextPlan` is likely still used by storage/member-limit upsell UI elsewhere in the app — do not delete it without confirming zero remaining imports).

- [ ] **Step 5: Manual verification in the browser**

Run the dev server (`npm run dev`), then:
1. Visit `/login` and `/register` with no query params — confirm the OAuth button row renders under the password form (Apple button at minimum; Google's button will only render once `NEXT_PUBLIC_OAUTH_GOOGLE_CLIENT_ID` is set — if it isn't yet, confirm no console error breaks the page).
2. Visit `/register?invite=<some-token>` and submit the password form with network devtools open — confirm the `POST /api/auth/register` body includes `"inviteToken"`.
3. Confirm password login/register still redirects to `/feed` (or `/admin`) exactly as before.

- [ ] **Step 6: Commit**

```bash
git add app/login/page.tsx app/register/page.tsx messages/en.json messages/el.json
git commit -m "$(cat <<'EOF'
Wire OAuth buttons into /login and /register, attach inviteToken directly

Drops the old login-then-accept-then-branch-on-error flow in favor of
attaching inviteToken to the auth call itself and letting the event
page's own membership check confirm access — redemption is silent per
the backend now, so there's nothing left to branch on here.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 13: Rebuild `InviteOnboardingBoundary.tsx` — drop "join as guest"

**Files:**
- Modify: `app/invite/[token]/InviteOnboardingBoundary.tsx`

- [ ] **Step 1: Remove the guest form entirely, keep only the two account options**

```tsx
'use client';

import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

import { InviteLayout } from '@/components/invite/InviteLayout';
import { InviteOnboardingState } from '@/components/invite/InviteOnboardingState';
import { InviteTerminalState } from '@/components/invite/InviteTerminalState';
import { useEventInvitationPreview } from '@/hooks/useEventInvitations';
import { useMediaItem } from '@/hooks/useMedia';
import { ApiError } from '@/lib/api/client';
import { routes } from '@/lib/routes';

const DEFAULT_HERO_IMAGE = '/images/couple-hero.png';

export default function InviteOnboardingBoundary({ token }: { token: string }) {
    const t = useTranslations('InviteOnboardingPage');

    const { data: preview, isLoading, error } = useEventInvitationPreview(token);
    const { data: coverMedia } = useMediaItem(preview?.coverMediaId ?? null);

    function renderTerminalState() {
        if ((error instanceof ApiError && error.status === 404) || !preview) {
            return <InviteTerminalState title={t('invalidInvite.title')} description={t('invalidInvite.description')} />;
        }

        if (preview.expired) {
            return <InviteTerminalState title={t('expiredInvite.title')} description={t('expiredInvite.description')} />;
        }

        if (preview.alreadyUsed) {
            return (
                <InviteTerminalState
                    title={t('alreadyUsedInvite.title')}
                    description={t('alreadyUsedInvite.description')}
                    action={
                        <Link
                            href={routes.login}
                            className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-brand text-white text-sm font-semibold hover:opacity-90 transition-opacity"
                        >
                            {t('haveAccount')}
                        </Link>
                    }
                />
            );
        }

        return null;
    }

    const terminalState = renderTerminalState();
    const activePreview = terminalState ? null : preview;

    const loginHref = routes.auth.login({ invite: token, email: activePreview?.email });
    const registerHref = routes.auth.register({ invite: token, email: activePreview?.email });

    return (
        <InviteOnboardingState
            isLoading={isLoading}
            terminalState={terminalState}
            content={
                activePreview ? (
                    <InviteLayout
                        coverImageSrc={coverMedia?.mediaUrl ?? DEFAULT_HERO_IMAGE}
                        coverImageAlt={t('defaultHeroImageAlt')}
                        eventTitle={activePreview.eventTitle}
                        eventSubtitle={activePreview.eventSubtitle}
                    >
                        {activePreview.eventDescription && (
                            <p className="text-sm text-ink-muted mb-7 leading-relaxed">{activePreview.eventDescription}</p>
                        )}

                        <div className="flex flex-col gap-3">
                            <Link
                                href={loginHref}
                                className="w-full flex items-center justify-center gap-2 py-3 rounded-full bg-gradient-brand text-white text-sm font-semibold hover:opacity-90 transition-opacity"
                            >
                                {t('haveAccount')}
                                <ArrowRight className="w-4 h-4" />
                            </Link>
                            <Link
                                href={registerHref}
                                className="w-full flex items-center justify-center gap-2 py-3 rounded-full bg-surface-muted text-ink text-sm font-semibold hover:bg-surface-muted/70 transition-colors"
                            >
                                {t('createAccount')}
                            </Link>
                        </div>
                    </InviteLayout>
                ) : null
            }
        />
    );
}
```

`loginHref`/`registerHref` already carry `invite: token` via `routes.auth.login`/`routes.auth.register` (unchanged from before) — Task 12's login/register pages read that `?invite=` param and attach it to the auth call, and Google/Apple sign-in on those pages picks up the same `inviteToken` since `OAuthButtons` receives it as a prop. No further plumbing needed here.

- [ ] **Step 2: Remove the now-dead `joinAsGuest`/`guestForm`/`back` keys**

In `messages/en.json`, under `InviteOnboardingPage`, remove `joinAsGuest`, `guestForm`. Keep `back` only if grep shows it's used elsewhere (it likely isn't — check `grep -rn "t('back')" app/invite` before removing). Apply the same trim to `messages/el.json`.

- [ ] **Step 3: Verify**

Run: `npx tsc --noEmit`
Expected: no errors from this file.

- [ ] **Step 4: Manual verification**

Visit `/invite/<a-real-token>` (create one via the host manage UI first) and confirm: no "Join as guest" button, "I have an account" and "Create an account" both carry `?invite=` through to `/login`/`/register`.

- [ ] **Step 5: Commit**

```bash
git add "app/invite/[token]/InviteOnboardingBoundary.tsx" messages/en.json messages/el.json
git commit -m "$(cat <<'EOF'
Drop the guest option from invite onboarding

register/login now carry inviteToken themselves (Task 12), so there's
nothing left for a guest-login button to call.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 14: New `AnonymousQrMediaUploadForm` component

**Files:**
- Create: `components/invite/AnonymousQrMediaUploadForm.tsx`

Split out of `QrCodeLandingBoundary` so Task 15 can compose it cleanly, per this repo's convention of splitting content/form pieces out of boundary components.

- [ ] **Step 1: Write the component**

```tsx
'use client';

import { ArrowRight, ImagePlus, Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import React, { useCallback, useState } from 'react';

import { FormFieldLabel } from '@/components/ui/FormFieldLabel';
import { useApiErrorMessage } from '@/hooks/useApiErrorMessage';
import { useUploadQrMediaBatch } from '@/hooks/useQrMediaUpload';

interface AnonymousQrMediaUploadFormProps {
    token: string;
}

export function AnonymousQrMediaUploadForm({ token }: AnonymousQrMediaUploadFormProps) {
    const t = useTranslations('QrCodePage');
    const toErrorMessage = useApiErrorMessage();
    const uploadBatch = useUploadQrMediaBatch();

    const [uploaderName, setUploaderName] = useState('');
    const [files, setFiles] = useState<File[]>([]);
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [done, setDone] = useState(false);

    const handleUploaderNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setUploaderName(e.target.value);
    }, []);

    const handleFilesChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setFiles(e.target.files ? Array.from(e.target.files) : []);
    }, []);

    async function handleSubmit(e: React.SubmitEvent<HTMLFormElement>) {
        e.preventDefault();
        if (files.length === 0) return;

        setSubmitError(null);
        try {
            await uploadBatch.mutateAsync({ token, files, uploaderName: uploaderName.trim() || undefined });
            setDone(true);
            setFiles([]);
        } catch (err) {
            setSubmitError(toErrorMessage(err));
        }
    }

    if (done) {
        return <p className="text-sm text-center text-ink-muted">{t('anonymousUpload.success')}</p>;
    }

    return (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <FormFieldLabel label={t('anonymousUpload.nameLabel')} optional>
                <input
                    type="text"
                    maxLength={100}
                    value={uploaderName}
                    onChange={handleUploaderNameChange}
                    placeholder={t('anonymousUpload.namePlaceholder')}
                    className="w-full bg-surface-muted rounded-xl px-4 py-3 text-sm text-ink placeholder:text-ink-faint outline-none focus:ring-2 focus:ring-primary/30 transition"
                />
            </FormFieldLabel>

            <FormFieldLabel label={t('anonymousUpload.filesLabel')} required>
                <label className="flex items-center gap-3 bg-surface-muted rounded-xl px-4 py-3 cursor-pointer">
                    <ImagePlus className="w-4 h-4 text-ink-muted shrink-0" />
                    <span className="flex-1 text-sm text-ink-muted truncate">
                        {files.length > 0 ? t('anonymousUpload.filesSelected', { count: files.length }) : t('anonymousUpload.chooseFiles')}
                    </span>
                    <input type="file" accept="image/*,video/*" multiple onChange={handleFilesChange} className="hidden" />
                </label>
            </FormFieldLabel>

            {submitError && (
                <p role="alert" className="text-xs text-center text-red-500 -mt-1">
                    {submitError}
                </p>
            )}

            <button
                type="submit"
                disabled={uploadBatch.isPending || files.length === 0}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-full bg-gradient-brand text-white text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-60 disabled:cursor-not-allowed"
            >
                {uploadBatch.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                    <>
                        {t('anonymousUpload.submit')}
                        <ArrowRight className="w-4 h-4" />
                    </>
                )}
            </button>
        </form>
    );
}
```

- [ ] **Step 2: Add `anonymousUpload` translation keys**

Add to `QrCodePage` in `messages/en.json`:

```json
"anonymousUpload": {
    "nameLabel": "Your name",
    "namePlaceholder": "How should we credit your photos?",
    "filesLabel": "Photos or videos",
    "chooseFiles": "Choose files",
    "filesSelected": "{count, plural, one {# file selected} other {# files selected}}",
    "submit": "Upload",
    "success": "Thanks! Your photos are on their way to the gallery."
}
```

Apply the same section to `messages/el.json`.

- [ ] **Step 3: Verify**

Run: `npx tsc --noEmit`
Expected: no errors from this file.

- [ ] **Step 4: Commit**

```bash
git add "components/invite/AnonymousQrMediaUploadForm.tsx" messages/en.json messages/el.json
git commit -m "$(cat <<'EOF'
Add AnonymousQrMediaUploadForm for public MEDIA_UPLOAD QR codes

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 15: Rebuild `QrCodeLandingBoundary.tsx` — route by target type, no guest-login

**Files:**
- Modify: `app/q/[token]/QrCodeLandingBoundary.tsx`

- [ ] **Step 1: Rewrite the boundary**

`EVENT_JOIN` now redirects straight to `/register?invite=...` (register, not login, as the default landing action — matches "no account exists yet" being the common case for a scanned poster; a returning visitor still has the "I have an account" link on that page). `MEDIA_UPLOAD` renders `AnonymousQrMediaUploadForm` with no auth. `INVITATION` keeps redirecting to `/invite/{token}` exactly as before.

```tsx
'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useEffect } from 'react';

import { AnonymousQrMediaUploadForm } from '@/components/invite/AnonymousQrMediaUploadForm';
import { InviteLayout } from '@/components/invite/InviteLayout';
import { InviteTerminalState } from '@/components/invite/InviteTerminalState';
import { QrLandingState } from '@/components/invite/QrLandingState';
import { useMediaItem } from '@/hooks/useMedia';
import { useQrLinkResolution } from '@/hooks/useQrLinks';
import { getQrTerminalCopyKey } from '@/lib/qrLinks';
import { routes } from '@/lib/routes';

const DEFAULT_HERO_IMAGE = '/images/couple-hero.png';

export default function QrCodeLandingBoundary({ token }: { token: string }) {
    const t = useTranslations('QrCodePage');
    const router = useRouter();

    const { data: resolution, isLoading, error } = useQrLinkResolution(token);
    const { data: coverMedia } = useMediaItem(resolution?.status === 'ACTIVE' ? (resolution.coverMediaId ?? null) : null);

    const isRedirectingToInvite = resolution?.status === 'ACTIVE' && resolution.targetType === 'INVITATION';
    const isRedirectingToRegister = resolution?.status === 'ACTIVE' && resolution.targetType === 'EVENT_JOIN';

    useEffect(() => {
        if (resolution?.status !== 'ACTIVE') return;

        if (resolution.targetType === 'INVITATION' && resolution.inviteToken) {
            router.replace(routes.inviteToken(resolution.inviteToken));
            return;
        }

        if (resolution.targetType === 'EVENT_JOIN' && resolution.inviteToken) {
            router.replace(routes.auth.register({ invite: resolution.inviteToken }));
        }
    }, [resolution, router]);

    function renderTerminalState() {
        if (error || !resolution || resolution.status !== 'ACTIVE') {
            const copyKey = getQrTerminalCopyKey(resolution, error);
            return <InviteTerminalState title={t(`${copyKey}.title`)} description={t(`${copyKey}.description`)} />;
        }

        if ((resolution.targetType === 'EVENT_JOIN' || resolution.targetType === 'INVITATION') && !resolution.inviteToken) {
            return <InviteTerminalState title={t('unavailable.title')} description={t('unavailable.description')} />;
        }

        return null;
    }

    const terminalState = renderTerminalState();
    const isRedirecting = isRedirectingToInvite || isRedirectingToRegister;
    const isMediaUpload = !terminalState && !isRedirecting && resolution?.status === 'ACTIVE' && resolution.targetType === 'MEDIA_UPLOAD';

    return (
        <QrLandingState
            isLoading={isLoading || isRedirecting}
            terminalState={terminalState}
            content={
                isMediaUpload ? (
                    <InviteLayout
                        coverImageSrc={coverMedia?.mediaUrl ?? DEFAULT_HERO_IMAGE}
                        coverImageAlt={t('defaultHeroImageAlt')}
                        eventTitle={resolution.eventTitle ?? t('fallbackTitle')}
                        eventSubtitle={resolution.eventSubtitle}
                    >
                        <div className="flex items-center gap-2 mb-4 text-xs font-semibold uppercase tracking-wide text-ink-muted">
                            {t('mediaUploadEyebrow')}
                        </div>
                        <AnonymousQrMediaUploadForm token={token} />
                    </InviteLayout>
                ) : null
            }
        />
    );
}
```

- [ ] **Step 2: Remove now-dead `guestForm`/`eventJoinEyebrow`/`invitationExhausted` keys from `QrCodePage`**

In `messages/en.json`, under `QrCodePage`, remove `guestForm` and `eventJoinEyebrow` (no longer rendered — `EVENT_JOIN` redirects instead of showing a form) and `invitationExhausted` (was only surfaced by the removed guest-login error branch). Keep `mediaUploadEyebrow`, `fallbackTitle`, `defaultHeroImageAlt`, `frozenNotice`, and the terminal-state keys (`unknown`/`revoked`/`expired`/`unavailable`) — all still used. Apply the same trim to `messages/el.json`.

- [ ] **Step 3: Verify**

Run: `npx tsc --noEmit`
Expected: no errors from this file.

- [ ] **Step 4: Manual verification**

Create one `EVENT_JOIN` and one `MEDIA_UPLOAD` QR link via the host manage UI (Task 16 makes the create form correct first — do this step after Task 16). Scan/open each `publicUrl`:
- `EVENT_JOIN` → lands on `/register?invite=...` with no flash of a guest form.
- `MEDIA_UPLOAD` → renders the upload form directly, no redirect, no auth. Upload a real file and confirm it shows up in the event gallery afterward.

- [ ] **Step 5: Commit**

```bash
git add "app/q/[token]/QrCodeLandingBoundary.tsx" messages/en.json messages/el.json
git commit -m "$(cat <<'EOF'
Rebuild QR landing: EVENT_JOIN/INVITATION redirect to auth, MEDIA_UPLOAD is anonymous

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 16: Host UI — `maxGuests` only for `EVENT_JOIN`

**Files:**
- Modify: `components/manage/invitations/CreateQrLinkForm.tsx`

`QrLinkRow.tsx` already gates editing on `qrLink.maxGuests !== null`, which naturally becomes `false` for `MEDIA_UPLOAD` once the backend starts returning `maxGuests: null` for it (§4 of the changelog) — no change needed there. `CreateQrLinkForm` unconditionally sends `maxGuests` today, which is now a `400` for `MEDIA_UPLOAD`; fix that.

- [ ] **Step 1: Only show/send `maxGuests` when `targetType === 'EVENT_JOIN'`**

Replace the `handleSubmit` body:

```ts
    async function handleSubmit(e: React.SubmitEvent<HTMLFormElement>) {
        e.preventDefault();
        const input: QrLinkRequestDto = {
            targetType,
            label: label.trim() || undefined,
            maxGuests: targetType === 'EVENT_JOIN' ? maxGuests : undefined,
        };

        try {
            const qrLink = await createQrLink.mutateAsync(input);
            if (targetType === 'EVENT_JOIN' && qrLink.maxGuests !== maxGuests) {
                onClampNoticeAction?.(t('qr.cappedToPlan', { count: qrLink.maxGuests ?? maxGuests }));
            }
            onDoneAction();
        } catch {
            // error surfaced inline below
        }
    }
```

Wrap the `maxGuests` `FormFieldLabel` block in a condition so it only renders for `EVENT_JOIN`:

```tsx
            {targetType === 'EVENT_JOIN' && (
                <FormFieldLabel label={t('qr.fields.maxGuests')} required className={cn(fieldLabelClass, 'mt-4')} labelClassName={fieldTextClass}>
                    <input
                        type="number"
                        required
                        min={1}
                        max={1000}
                        value={maxGuests}
                        onChange={handleMaxGuestsChange}
                        className={fieldControlClass}
                    />
                </FormFieldLabel>
            )}
```

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit`
Expected: no errors from this file.

- [ ] **Step 3: Manual verification**

In the host manage UI's QR-links panel, create a `MEDIA_UPLOAD` link — confirm the max-guests field is hidden and the create call succeeds (no more `400 3001`).

- [ ] **Step 4: Commit**

```bash
git add "components/manage/invitations/CreateQrLinkForm.tsx"
git commit -m "$(cat <<'EOF'
QR create form: only send maxGuests for EVENT_JOIN links

MEDIA_UPLOAD no longer has a backing invitation to cap — sending
maxGuests for it is now a 400 (errorCode 3001).

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 17: Delete dead code — `lib/invite/joinAfterAuth.ts`

**Files:**
- Delete: `lib/invite/joinAfterAuth.ts`

- [ ] **Step 1: Confirm it's genuinely unused**

Run: `grep -rn "joinEventAfterAuth" --include="*.ts" --include="*.tsx" .`
Expected: no matches outside the file itself (Task 12 removed the only two call sites).

- [ ] **Step 2: Delete it**

```bash
git rm lib/invite/joinAfterAuth.ts
```

Leave `hooks/useEventInvitations.ts`'s `useAcceptEventInvitation` (the `POST /event-invitations/{inviteToken}/accept` mutation) in place — the changelog states that endpoint is unchanged and still valid for an already-authenticated user hitting an invite link (Part B step 3), even though no current page calls it after this refactor. It's a thin, general-purpose data hook, not feature-specific glue built only for the removed flow.

- [ ] **Step 3: Verify**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add lib/invite/joinAfterAuth.ts
git commit -m "$(cat <<'EOF'
Remove joinEventAfterAuth — dead after the login/register rewrite

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 18: Full-repo verification pass

**Files:** none (verification only)

- [ ] **Step 1: Type-check**

Run: `npx tsc --noEmit`
Expected: zero errors.

- [ ] **Step 2: Lint**

Run: `npm run lint` (check `package.json` for the exact script name if this fails)
Expected: zero errors. Fix any that surface (likely just unused-import warnings from the deleted guest-login code paths).

- [ ] **Step 3: Unit tests**

Run: `npm test`
Expected: all pass, including the new `lib/api/client.test.ts` from Task 9.

- [ ] **Step 4: Repo-wide grep for anything still referencing the removed surface**

Run: `grep -rn "guestLogin\|guest-login\|guestKey\|GuestLoginRequestDto\|GUEST_ACCESS_TOKEN_MAX_AGE_SECONDS\|encodeGuestCookie\|decodeGuestCookie" --include="*.ts" --include="*.tsx" . | grep -v "docs/integration guides"`
Expected: no matches. (The old integration-guide docs intentionally still describe the pre-2026-09-04 behavior for historical reference per the changelog doc — leave those alone.)

- [ ] **Step 5: Browser smoke test of the full golden path**

With a real Google/Apple client ID configured locally:
1. `/register` → Google sign-in → lands on `/feed`.
2. `/register?invite=<token>` → password sign-up → lands on `/feed`; separately confirm via the host's member list that the invite was actually redeemed.
3. Scan a `MEDIA_UPLOAD` QR `publicUrl` on a phone or with devtools mobile emulation → upload a photo with no login → confirm it appears in the event gallery with `anonymousUploaderName` set (check the network response, since no UI currently renders that field — see Task 19 below for that gap).
4. Scan an `EVENT_JOIN` QR `publicUrl` → confirm it lands on `/register?invite=...`.

- [ ] **Step 6: No commit for this task** — it's verification-only. If Step 2 or 4 turns up something, fix it in a follow-up commit referencing which task's file it belongs to.

---

## Out of scope (flagged, not implemented)

- **Rendering `anonymousUploaderName` in the gallery UI.** Grepped the codebase — no gallery component currently renders an uploader name for *any* media item (`uploaderMemberId` included), so there's no existing pattern to extend. Task 2 adds the field to `MediaResponseDto` so it's available, but building new "who uploaded this" UI in the gallery is a separate, unscoped feature. Flag to the user before considering this done.
- **`GET /api/events/{eventId}/members/me` explicit post-auth confirmation.** Per the confirmed scope, the simpler "redirect and let the event page handle it" strategy was chosen instead.
- **Apple's registered redirect URI.** `AppleID.auth.init`'s `redirectURI` must be pre-registered in Apple's own developer console outside this codebase — flagged in Task 11, not something this plan can verify.
- **Real `NEXT_PUBLIC_OAUTH_GOOGLE_CLIENT_ID` / `NEXT_PUBLIC_OAUTH_APPLE_CLIENT_ID` values.** Task 11 only adds the `.env.example` placeholders; real values are an ops/config task outside this repo's plan.
