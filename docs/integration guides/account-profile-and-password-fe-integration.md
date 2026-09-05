# Integration Guide: Self-Service Profile Editing & Password Management

Added 2026-08-28, revised 2026-08-28 (profile picture switched from a client-supplied URL to a
real file upload). Covers five flows: fetching your own account details, editing your own
profile, uploading a profile picture, changing your password while logged in, and resetting a
forgotten password. See `frontend-integration-guide.md` for everything else.

## What changed

Four new endpoints under `/api/me`, plus documentation for two `/api/auth` endpoints that
already existed but were never written up for the frontend.

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/api/me` | `USER`, `GUEST`, `ADMIN` | fetch the caller's own account details |
| PATCH | `/api/me` | `USER`, `GUEST`, `ADMIN` | edit your own first name / last name |
| POST | `/api/me/profile-picture` | `USER`, `GUEST`, `ADMIN` | upload and set your profile picture |
| POST | `/api/me/change-password` | `USER`, `ADMIN` | change your password while logged in (requires current password) |
| POST | `/api/auth/forgot-password` | public | mail a reset link for a forgotten password |
| POST | `/api/auth/reset-password` | public | consume that link's token, set a new password |

None of these touch email, role, account status, or deletion — those remain admin-only via
`PATCH /api/users/{id}` (`ROLE_ADMIN`, see `frontend-integration-guide.md`).

**Profile picture is no longer a plain string field.** The first version of this guide had
`PATCH /api/me` accept a client-supplied `profilePicUrl`. That let anyone point their profile at
an arbitrary URL, and the backend had no way to apply the same validation (magic-byte type
sniffing, EXIF/GPS stripping, size/dimension caps) that event media uploads already get. It's
now a real file upload — see §3 below — and the response field is `profilePictureUrl`, a
short-lived presigned URL the backend resolves from a private storage key.

## 1. Fetching your own details — `GET /api/me`

Returns the caller's own `UserResponseDto` (same shape as the `PATCH /api/me` response below).
No path variable, no query params — the target is always resolved from the JWT subject.

```ts
async function getMyself() {
  const res = await fetch('/api/me', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw await res.json();
  return res.json() as Promise<UserResponseDto>;
}
```

This is the endpoint to call on app load / after a token refresh to populate a profile screen
or account menu — `AuthResponseDto` from login/register carries only `firstName`/`lastName`, not
the full record, and there was previously no way to re-fetch it without going through the admin
`GET /api/users/{id}` endpoint (which the caller usually can't call on themselves — that's
`ROLE_ADMIN`-only).

## 2. Editing your own profile — `PATCH /api/me`

```ts
interface MeUpdateRequestDto {
  firstName?: string; // max 100 chars
  lastName?: string;  // max 100 chars
}
```

Returns the updated `UserResponseDto`:

```ts
interface UserResponseDto {
  id: string;
  email: string | null;
  firstName: string | null;          // NEW on this DTO — was missing before
  lastName: string | null;           // NEW
  profilePictureUrl: string | null;  // NEW — short-lived presigned URL, see §3
  authProvider: 'LOCAL' | 'OAUTH' | 'INVITE';
  isGuestAccount: boolean;
  status: 'ACTIVE' | 'SUSPENDED' | 'DELETED';
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  platformRole: 'USER' | 'ADMIN' | 'GUEST';
}
```

**Partial update semantics**: only fields present and non-null in the body are applied.
Omit a field (or send it as `null`) to leave it unchanged — the same pattern as the admin
`PATCH /api/users/{id}` endpoint. There is no way to clear a field back to `null` once set;
send an empty string if you need to blank it out.

```ts
async function updateProfile(patch: Partial<{ firstName: string; lastName: string }>) {
  const res = await fetch('/api/me', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify(patch),
  });
  if (!res.ok) throw await res.json();
  return res.json() as Promise<UserResponseDto>;
}
```

No path variable — the target is always the caller, resolved from the JWT subject. There is no
way to edit another user's profile through this endpoint, by design.

**Guests can call this too** (they hold a `User` row with `firstName`/`lastName`, same as
registered users), but note `lastName` will just sit unused unless your guest-facing UI surfaces
it — nothing on the backend distinguishes guest vs. registered here.

## 3. Uploading a profile picture — `POST /api/me/profile-picture`

`multipart/form-data` with a single field, `file`:

```ts
async function uploadProfilePicture(file: File) {
  const form = new FormData();
  form.append('file', file);
  const res = await fetch('/api/me/profile-picture', {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` }, // no Content-Type — let fetch set the multipart boundary
    body: form,
  });
  if (!res.ok) throw await res.json();
  return res.json() as Promise<UserResponseDto>; // profilePictureUrl now points at the new image
}
```

Uploading again **replaces** the existing picture — there's no separate delete endpoint, so
"remove my photo" isn't currently supported; the closest thing the FE can offer is "upload a new
one."

The file goes through the same pipeline as event media uploads:

- **Accepted formats**: JPEG, PNG, WEBP, GIF. Anything else (including a file that's merely
  *named* `.jpg` but isn't one — the check is on the actual bytes, not the filename or the
  browser-supplied `Content-Type`) is rejected with `415`/`errorKey: UNSUPPORTED_MEDIA_FORMAT`.
- **Size cap**: same as an event image (25 MB by default, server-configured) — over that comes
  back as `413`/`errorKey: MEDIA_FILE_TOO_LARGE`.
- **Pixel cap**: an extreme-dimension image (a decompression-bomb shape) is rejected before
  decoding, same as event media.
- **EXIF/GPS stripped automatically** for JPEG/PNG by re-encoding — don't worry about scrubbing
  location metadata client-side before upload.

**`profilePictureUrl` is a short-lived presigned URL, not a stable link** — same caveat as
`MediaResponseDto.mediaUrl` in `frontend-integration-guide.md`. It expires (15 minutes by
default). Don't store it, don't put it in a `<link rel="icon">` or anywhere else that outlives
the current page load — re-fetch `GET /api/me` (or use the DTO you already got back from the
upload/patch call, which is fresh) whenever you need to render the picture again, e.g. after a
page reload.

### Error responses

| Status | `errorKey` | Cause |
|---|---|---|
| 415 | `UNSUPPORTED_MEDIA_FORMAT` | file isn't an allowlisted image format |
| 413 | `MEDIA_FILE_TOO_LARGE` | file exceeds the size cap |
| 400 | `VALIDATION_FAILED` (or a media-specific key) | image dimensions exceed the pixel cap, or the bytes can't actually be decoded as the detected format |
| 429 | — | rate limit exceeded (20 uploads/hour per caller) |

## 4. Changing your password — `POST /api/me/change-password`

```ts
interface ChangePasswordRequestDto {
  currentPassword: string;
  newPassword: string; // 8-100 chars, same bounds as registration/reset
}
```

`204 No Content` on success — no body. Rate-limited to **5 requests/hour** per caller.

```ts
async function changePassword(currentPassword: string, newPassword: string) {
  const res = await fetch('/api/me/change-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({ currentPassword, newPassword }),
  });
  if (res.status === 204) return;
  throw await res.json();
}
```

**Every signed-in device is logged out when this succeeds — including the one that just made
the call.** The access token in hand still works until it naturally expires (~15 min, same as
logout), but the refresh token is revoked, so the next silent refresh attempt will fail.
Immediately after a successful call, treat this exactly like a manual logout: clear stored
tokens and route to the login screen with a "your password was changed — please sign in again"
message. Don't try to keep the session alive.

### Error responses

| Status | `errorKey` | Cause | Suggested UI |
|---|---|---|---|
| 400 | `VALIDATION_FAILED` | `currentPassword` correct format but account has no password (OAuth or guest account) | "This account doesn't use a password" — shouldn't normally be reachable since the endpoint is `USER`/`ADMIN`-only, but an OAuth-only user could still hit it |
| 401 | `INVALID_CREDENTIALS` | `currentPassword` doesn't match | inline error on the current-password field, don't reveal anything else |
| 429 | — | rate limit exceeded | "Too many attempts, try again later" |

Both new-password bounds violations (too short/long) come back as the standard
`VALIDATION_FAILED` per-field shape (see `frontend-integration-guide.md` / the
`GlobalExceptionHandler` doc comment) via normal `@Valid` handling — same as `reset-password`
below.

## 5. Forgotten password — `POST /api/auth/forgot-password` + `POST /api/auth/reset-password`

These are pre-existing, unauthenticated endpoints (they have to be — the caller can't log in).
Not new, but undocumented until now.

### Step 1 — request a link

```ts
interface ForgotPasswordRequestDto {
  email: string;
}
```

`POST /api/auth/forgot-password` → always `204 No Content`, rate-limited to **3
requests/hour** per caller. **The response is identical whether or not the address has an
account** — this is deliberate, to prevent using the endpoint to enumerate registered emails.
Don't build a "no account with that email" message off this call; show a generic "if that
address has an account, we've sent a link" regardless of outcome.

An address is silently skipped (still `204`, still no signal) if it belongs to a guest
account, a suspended account, an OAuth account, or an account with no password set — none of
those can meaningfully use a reset link.

### Step 2 — consume the link

The mailed link contains a `token` query parameter your reset-password page reads and submits:

```ts
interface ResetPasswordRequestDto {
  token: string;
  newPassword: string; // 8-100 chars
}
```

`POST /api/auth/reset-password` → `204 No Content` on success. Rate-limited to **10
requests/minute** — this one is *not* silent on failure, since by this point the caller holds
a link that was mailed to a real address:

| Status | `errorKey` | Cause |
|---|---|---|
| 400 | `VALIDATION_FAILED` | token invalid, expired, or already used — message: *"This reset link is no longer valid. Request a new one."* |

```ts
async function resetPassword(token: string, newPassword: string) {
  const res = await fetch('/api/auth/reset-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, newPassword }),
  });
  if (res.status === 204) return;
  const err = await res.json();
  // err.message is safe to show directly here
  throw err;
}
```

On success this also revokes every session for the account (same as `change-password` above —
route to login) and, as a side effect, marks the account's email as verified if it wasn't
already (proving control of the mailbox satisfies verification too).

## Summary of session-revocation behavior

Both password-changing flows sign out every device on success — this is intentional, not a
bug to route around. Whichever screen triggers the request should always end in "you've been
logged out, sign in with your new password," never a normal in-place success toast that leaves
the user on an authenticated screen with a token that's about to stop refreshing.

| Flow | Revokes sessions? | Requires current password? |
|---|---|---|
| `PATCH /api/me` (profile) | No | No |
| `POST /api/me/change-password` | Yes, all | Yes |
| `POST /api/auth/reset-password` | Yes, all | No (token proves identity instead) |
