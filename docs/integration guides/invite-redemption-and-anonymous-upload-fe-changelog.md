# FE changelog: guest-login retirement + anonymous gallery upload

**2026-09-04 — breaking.** Read this before touching `invite-onboarding-fe-integration.md` or
`qr-links-fe-integration.md` again — both documents describe a `POST /api/auth/guest-login`
endpoint that **no longer exists**. It has been fully removed, not deprecated: calling it now
returns `404`.

This is one coherent change, not two: the "join as guest" shortcut is gone because every flow
that used to create a guest account now either (a) requires a real account (register/login/oauth,
same as everywhere else in the app) or (b) needs no account at all. Which one applies depends on
`QrTargetType`:

| target type | before | now |
|---|---|---|
| `EVENT_JOIN` / `INVITATION` | guest-login *or* register/login + accept | **register/login/oauth only**, with `inviteToken` attached |
| `MEDIA_UPLOAD` | guest-login, then join the event, then upload | **no account, no join** — two new anonymous upload endpoints |

If your app only integrated QR-code media upload and never used guest-login for `EVENT_JOIN`,
you still need §2 below — `MEDIA_UPLOAD`'s behavior changed too, not just guest-login.

---

## 1. `EVENT_JOIN` / `INVITATION`: guest-login is replaced by `inviteToken` on auth

**What's gone:**
- `POST /api/auth/guest-login` — 404 now.
- `GuestLoginRequestDto`, the `guestKey` request/response mechanics, `PlatformRole.GUEST`.
- The "Join as guest (no account)" option on the onboarding page has nowhere to go.

**What replaces it.** `RegisterRequestDto`, `LoginRequestDto`, and `OAuthLoginRequestDto` each
gained an optional field:

```ts
inviteToken?: string;  // UUID, straight from the QR resolve response or the invite link
```

Attach it to whichever of the three the visitor picks:

```
POST /api/auth/register   { email, password, displayName, inviteToken }
POST /api/auth/login      { email, password, inviteToken }
POST /api/auth/oauth/{provider}   { idToken, inviteToken }
```

The account is created/authenticated exactly as before — `AuthResponseDto` back, same shape,
same status codes for the auth part itself. **Redemption is best-effort and silent:** if
`inviteToken` is missing, expired, exhausted, or already used, the auth call still succeeds and
the response still comes back normal. The caller is *not* joined to the event, and the response
tells you nothing about whether redemption happened — there is no `joined: true/false` field.

This means the frontend cannot render "you're in!" off the auth response alone. Two options:

- **Simplest:** treat the redirect after auth as success regardless, and let the event's own
  membership check (whatever the app already does when landing on an event page) discover
  whether the visitor is actually a member. If not, show a normal "you don't have access" state —
  same as any other unauthorized event view.
- **If you need an explicit confirmation**, call `GET /api/events/{eventId}/members/me` (or
  whatever the app's existing "am I a member" check is) right after auth completes, using the
  `eventId` from the QR/invite preview response.

**Already signed in?** Nothing changed here — `POST /api/event-invitations/{inviteToken}/accept`
with the existing `accessToken` still works exactly as documented in
`invite-onboarding-fe-integration.md` Part B step 3.

**`guestKey` is dead everywhere**, not just on guest-login. `AuthResponseDto.guestKey` and
`QrLinkResolutionDto.requiresGuestKey` still exist in the wire shapes (unused fields, not yet
removed from the DTOs) but no live code path sets `requiresGuestKey: true` or returns a
`guestKey` anymore for `EVENT_JOIN`/`INVITATION` — see §3. Delete any `storedGuestKey()` /
`localStorage` guest-key handling; it has nothing left to talk to.

---

## 2. `MEDIA_UPLOAD`: fully anonymous now — no account, no join

Previously a `MEDIA_UPLOAD` QR code joined the scanner to the event (via guest-login) and then
routed them into the gallery upload flow, exactly like `EVENT_JOIN`. **That's gone.** Scanning a
`MEDIA_UPLOAD` code no longer creates any account, member, or session — the scanned `token` is
now the upload credential, full stop.

### New endpoints

```
POST /api/qr/{token}/media          — single file
POST /api/qr/{token}/media/batch    — multiple files
```

Both are **fully public** — no `Authorization` header, nothing to authenticate. Multipart form
data, same param convention as the existing authenticated upload endpoints:

```
POST /api/qr/{token}/media
Content-Type: multipart/form-data

file: <binary>
uploaderName: "Jamie"     // optional, free text, max 100 chars — what to attribute the photo to
```

```
POST /api/qr/{token}/media/batch
Content-Type: multipart/form-data

files: <binary>, <binary>, ...
uploaderName: "Jamie"     // optional, applies to every file in the batch
```

`token` is the same opaque string from the QR's `publicUrl` — the `{token}` segment of
`/q/{token}`, not `inviteToken`. There is no invite token in this flow at all.

**201 response** for the single-file endpoint (`MediaResponseDto` — same shape the authenticated
gallery upload already returns, with one addition):

```jsonc
{
  "id": "…",
  "eventId": "…",
  "uploaderMemberId": null,           // always null for anonymous uploads
  "anonymousUploaderName": "Jamie",   // NEW field — what was typed, or null
  "mediaUrl": "https://…",
  "status": "PROCESSING",
  // ...same fields as any other MediaResponseDto
}
```

**200 response** for the batch endpoint (`MediaBatchUploadResponseDto` — same shape as the
existing authenticated batch endpoint):

```jsonc
{
  "created": [ /* MediaResponseDto[], as above */ ],
  "failed": [ { "originalFilename": "corrupt.jpg", "errorCode": 3014, /* ... */ } ]
}
```

`anonymousUploaderName` is new on `MediaResponseDto` — it now appears on **every** media item's
response, not just uploads through these two endpoints (it's `null` for member uploads). If your
gallery view renders an uploader label, branch on which of `uploaderMemberId` /
`anonymousUploaderName` is set — exactly one is, never both, and a media item can have neither
(pre-existing uploads, or an anonymous upload with no name typed).

### Error cases

Both endpoints throw before touching storage if the token doesn't resolve to an active
`MEDIA_UPLOAD` code:

| errorCode | HTTP | meaning |
|---|---|---|
| `2004 QR_LINK_NOT_FOUND` | 404 | token was never issued |
| `2005 QR_LINK_NOT_AVAILABLE` | 409 | token exists but isn't usable right now — revoked, expired, event unavailable, **or the code isn't a `MEDIA_UPLOAD` code** (e.g. someone hand-edited an `EVENT_JOIN` URL) |

Past that point, the usual upload validation errors apply unchanged: `3012`
`UNSUPPORTED_MEDIA_FORMAT`, `3013` `MEDIA_FILE_TOO_LARGE`, `3014` `MEDIA_FILE_CORRUPT`, `3016`
`MEDIA_IMAGE_TOO_MANY_PIXELS`, `5008` `EVENT_STORAGE_LIMIT_EXCEEDED`, rate limiting (`3010`, 60
requests/min per caller IP — shared between the two endpoints). On the batch endpoint, a per-file
failure lands in `failed[]` rather than failing the whole request, same as the existing
authenticated batch upload.

### What this means for the scan → upload page

There is no join step anymore. The flow for a `MEDIA_UPLOAD` code is now:

```
1. GET /api/qr/{token} → status: ACTIVE, targetType: MEDIA_UPLOAD, eventId, eventTitle, ...
2. Show an upload form directly (optionally ask for a display name → uploaderName)
3. POST /api/qr/{token}/media (or /media/batch) with the file(s)
4. Done — no auth call, no accept call, nothing to persist client-side
```

If your existing gallery-upload UI expects a JWT before it will render (because it also serves
the authenticated member flow), branch it: an anonymous `MEDIA_UPLOAD` visitor never gets one and
never needs one.

---

## 3. `GET /api/qr/{token}` resolve response: what changed

`QrLinkResolutionDto` itself didn't gain or lose fields, but what gets populated for
`MEDIA_UPLOAD` changed to match §2:

```jsonc
// EVENT_JOIN / INVITATION — unchanged shape, still needs inviteToken + auth
{
  "status": "ACTIVE",
  "targetType": "EVENT_JOIN",
  "eventId": "…", "eventTitle": "…", "eventSubtitle": "…", "coverMediaId": "…",
  "eventStatus": "ACTIVE",
  "inviteToken": "b3f1…",
  "requiresAuth": true,
  "requiresGuestKey": true
}
```

```jsonc
// MEDIA_UPLOAD — no invite token, no auth needed
{
  "status": "ACTIVE",
  "targetType": "MEDIA_UPLOAD",
  "eventId": "…", "eventTitle": "…", "eventSubtitle": "…", "coverMediaId": "…",
  "eventStatus": "ACTIVE",
  "inviteToken": null,
  "requiresAuth": false,
  "requiresGuestKey": null
}
```

Route on `targetType` as before; the only change is what you do once you're routed to
`MEDIA_UPLOAD` (§2) versus `EVENT_JOIN`/`INVITATION` (§1). `requiresGuestKey` should be treated
as dead weight for every target type now — see the note at the end of §1.

## 4. Host-side QR link management: `maxGuests` no longer applies to `MEDIA_UPLOAD`

`maxGuests` on `POST/PATCH /api/qr-links` (and the equivalent invitation-backed limit) now
applies to `EVENT_JOIN` only. Sending it for a `MEDIA_UPLOAD` or `INVITATION` link is a `400`
(`errorCode 3001`) — it used to silently apply to `MEDIA_UPLOAD` too, since both shared a backing
invitation. They no longer share anything: a `MEDIA_UPLOAD` link now mints **no** backing
invitation at all (`targetId` is `null` in its response), because there's no membership to cap.

If your host UI shows a `maxGuests` field when editing a `MEDIA_UPLOAD` link, hide it — there is
nothing left for it to control, and the field-notes table in `qr-links-fe-integration.md` still
says otherwise until you re-read it against this doc.

Switching a link's `targetType` **to or from** `MEDIA_UPLOAD` no longer "reuses the backing
invitation" the way switching between `EVENT_JOIN` and `MEDIA_UPLOAD` used to — `MEDIA_UPLOAD`
has none to reuse. Switching `EVENT_JOIN` → `MEDIA_UPLOAD` now drops the invitation link
entirely (any guests who already joined through it keep their membership; the code just stops
minting new joins and starts accepting uploads instead). Switching back to `EVENT_JOIN` mints a
fresh invitation, same as creating a new `EVENT_JOIN` link would.

## New error code

| code | key | HTTP | when |
|---|---|---|---|
| 2005 | `QR_LINK_NOT_AVAILABLE` | 409 | the scanned token was issued but can't be used for the write it was asked to perform — revoked, expired, event unavailable, or wrong `targetType` for the endpoint |

Distinct from the existing `2004 QR_LINK_NOT_FOUND` (token never issued at all). Only the two new
anonymous upload endpoints throw `2005` today.

## Checklist

- [ ] Delete every call site of `POST /api/auth/guest-login` — it 404s now.
- [ ] Delete client-side `guestKey` generation/storage (`storedGuestKey()`,
      `localStorage.getItem('guestKey')`, etc.) — nothing reads it anymore.
- [ ] `EVENT_JOIN` / `INVITATION` onboarding: replace the "Join as guest" button with the normal
      register/login/oauth forms, attaching `inviteToken` to whichever the visitor submits.
- [ ] Since redemption is silent, decide how the page confirms membership after auth (§1) —
      redirect-and-let-the-event-page-handle-it is the simplest option.
- [ ] `MEDIA_UPLOAD` onboarding: remove the join/auth step entirely. Resolve the token, show an
      upload form, `POST` straight to `/api/qr/{token}/media` (or `/media/batch`).
- [ ] Render `anonymousUploaderName` wherever the gallery already renders an uploader's name,
      alongside the existing member-uploader case.
- [ ] Handle `2005 QR_LINK_NOT_AVAILABLE` on the two new upload endpoints, distinct from `2004`.
- [ ] Host UI: hide/remove `maxGuests` editing for `MEDIA_UPLOAD` links.
- [ ] Re-read `invite-onboarding-fe-integration.md` Part B and `qr-links-fe-integration.md` §1,
      §2, §4, §5 against this doc before relying on them — both still describe guest-login in
      places pending a full rewrite.
