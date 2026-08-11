# FE integration guide: dynamic QR links

Shipped 2026-08-11. Assumes you've read `frontend-integration-guide.md` §0 (base URL, auth
header, error envelope). This doc covers the new QR-link endpoints and the one **breaking change**
to guest login that comes with them — see [What changed in guest login](#what-changed-in-guest-login),
which affects the existing invite flow too, not just QR codes. `docs/frontend-api-types.ts` has
the shapes; `docs/invite-onboarding-fe-integration.md` was updated in place.

## Why

A host prints a QR code onto a table card, a poster, a welcome sign. That object then sits in the
physical world for months. Everything about the destination has to stay changeable *behind* it,
because the one thing nobody will do is reprint two hundred cards.

So the QR encodes a URL and nothing else — `https://your-app/q/{token}` — with no event id, no
role, no guest data, and no query parameters. The backend owns what the token means and can
repoint or kill it at any time. The frontend's entire job is: render the URL the backend gave you,
and when someone scans it, ask the backend what it means.

## What this does *not* do

- **No QR image generation.** The backend returns a URL string. Use a QR rendering library
  (`qrcode`, `qrcode.react`, whatever you like). Download/print/share UX is entirely yours.
- **No scan analytics.** Resolving a QR performs zero writes — no scan counter, no
  `lastScannedAt`. This was deliberate: it keeps an anonymous endpoint free of write
  amplification. If you want scan stats later, `TelemetryEvent` is the existing home for it.
- **No short-URL service.** `/q/{token}` is a route in your app, not a redirect hop.
- **No new upload or join endpoints.** A resolved QR hands you an `inviteToken` and you continue
  through the existing `POST /api/auth/guest-login`.

---

## 1. Host side: create a QR link

```
POST /api/events/{eventId}/qr-links      ROLE_USER, must be a host of the event
```

```jsonc
// request
{
  "targetType": "EVENT_JOIN",   // required: EVENT_JOIN | MEDIA_UPLOAD | INVITATION
  "maxGuests": 80,              // optional, 1..1000, default 50. Shared types only.
  "label": "Entrance poster",   // optional, max 100. Host-facing only, never public.
  "metadata": { "printRun": "spring-2026" },  // optional, host-facing only
  "expiresAt": null             // optional. Omit for "never", which is usually right.
}
```

```jsonc
// 201 Created
{
  "id": "8f2c…",
  "eventId": "1a4b…",
  "token": "kJ8vQ2mR…",                                  // 43 chars, opaque
  "publicUrl": "https://your-app/q/kJ8vQ2mR…",           // ← render THIS as the QR
  "targetType": "EVENT_JOIN",
  "targetId": "c91e…",     // the backing invitation
  "label": "Entrance poster",
  "metadata": { "printRun": "spring-2026" },
  "expiresAt": null,
  "revokedAt": null,
  "createdByUserId": "77aa…",
  "createdAt": "2026-08-11T10:00:00Z",
  "updatedAt": "2026-08-11T10:00:00Z"
}
```

### Field notes

- **`publicUrl` is the deliverable.** Render it, don't construct it. The origin comes from a
  backend config property (`PUBLIC_BASE_URL`) so the URL convention can change without a frontend
  release. Building `${window.location.origin}/q/${token}` yourself will work today and silently
  break the day the public origin diverges from wherever your app is served.
- **`targetType`** decides which screen a scan lands on:
  | value | what it means | who it's for |
  |---|---|---|
  | `EVENT_JOIN` | join the event, land on the event home | a poster, a welcome sign |
  | `MEDIA_UPLOAD` | join the event, land in the gallery upload flow | table cards saying "share your photos" |
  | `INVITATION` | resolve a specific personalised invitation | a QR printed on one person's invite card |
- **`targetId`** must be supplied for `INVITATION` (and must be an invitation belonging to the
  same event — a mismatch is a 400). It must be **omitted** for the other two, which mint their
  own backing invitation. Sending it anyway is a 400 rather than being ignored.
- **`maxGuests`** applies to `EVENT_JOIN`/`MEDIA_UPLOAD`. For `INVITATION` the pointed-at
  invitation's own limit governs, so this field is ignored there.
- **`label` and `metadata` are host-only.** They never appear on the public resolve response. Do
  not put anything in `metadata` that a guest needs — they will not receive it.
- **`token`** is on the host response so you can build deep links. Treat it as a credential:
  don't log it, don't put it in analytics events.

Errors: `403` if the caller isn't a host of the event. `409` `errorCode 5014`/`5016` if the event
is DRAFT (unpaid) or FROZEN — you cannot mint a code for an event nobody can join yet. `400`
`errorCode 3001` for validation.

## 2. Host side: list, inspect, repoint, revoke

```
GET    /api/events/{eventId}/qr-links   → QrLinkResponseDto[]  (includes revoked ones)
GET    /api/qr-links/{id}               → QrLinkResponseDto
PATCH  /api/qr-links/{id}               → QrLinkResponseDto
POST   /api/qr-links/{id}/revoke        → QrLinkResponseDto
DELETE /api/qr-links/{id}               → 204
```

All host-only, all `ROLE_USER` + host of the link's own event.

`PATCH` accepts `targetType`, `targetId`, `label`, `metadata`, `expiresAt` — all optional, omitted
fields unchanged. **`token` and `publicUrl` never change.** That is the entire point: a host can
switch a hundred printed cards from "join the event" to "upload your photos" and every card keeps
working.

Switching between `EVENT_JOIN` and `MEDIA_UPLOAD` reuses the backing invitation, so guests who
already joined through that code keep their membership. Switching *to* `INVITATION` requires a
`targetId`.

**Prefer `revoke` over `delete` for anything already printed.** Revoking makes future scans report
`REVOKED`, so you can show "the host turned this code off". Deleting makes them 404, so the guest
holding the card is told it never existed — a worse answer to the same question. Revocation is
one-way and idempotent.

## 3. Guest side: resolving a scanned code

```
GET /api/qr/{token}      PUBLIC — send no Authorization header
```

The scanned URL opens `/q/{token}` in your app. Pull the token out of the route, call this, branch
on `status`.

```jsonc
// 200 OK — the only case that carries event details
{
  "status": "ACTIVE",
  "targetType": "MEDIA_UPLOAD",
  "eventId": "1a4b…",
  "eventTitle": "Maria & Nikos",
  "eventSubtitle": "Santorini, September",
  "coverMediaId": "e70c…",
  "eventStatus": "ACTIVE",
  "inviteToken": "b3f1…",
  "requiresAuth": true,
  "requiresGuestKey": true
}
```

```jsonc
// 200 OK — every unusable state. status and targetType only.
{ "status": "REVOKED", "targetType": "EVENT_JOIN" }
```

### Field notes

- **Only `status` and `targetType` are guaranteed.** Everything else is `ACTIVE`-only. A revoked
  or expired code deliberately returns no event title — a poster photographed off a wall should
  stop telling strangers whose wedding it was.
- **The four statuses**, and what to show:
  | status | HTTP | what happened | suggested UI |
  |---|---|---|---|
  | `ACTIVE` | 200 | usable | continue into the flow for `targetType` |
  | `REVOKED` | 200 | the host turned it off | "This code is no longer active. Ask your host for a new one." |
  | `EXPIRED` | 200 | past its `expiresAt` | "This code has expired." |
  | `TARGET_UNAVAILABLE` | 200 | event deleted, not yet live, or purged | "This event isn't available." |
  | *unknown token* | **404**, `errorCode 2004` | never issued | "We don't recognise this code." |
- **`eventStatus`** is `ACTIVE` or `FROZEN` only. A frozen event is readable but rejects every
  write, so on `MEDIA_UPLOAD` you should disable the upload CTA up front rather than let the guest
  pick photos and fail at submit.
- **`requiresGuestKey`** tells you whether the follow-up guest-login needs a `guestKey`. It's
  `true` for every shared code. See below.
- **Note what isn't here:** no QR-link id, no `label`, no `metadata`, no `maxGuests`, no invitation
  PII, no member or user data. Don't try to reconstruct context from anything but this response —
  the backend re-derives everything server-side from `inviteToken` on the next call, and won't
  trust a client-supplied event id or role.

## 4. Guest side: continuing into the flow

Same for all three target types — a stranger scanning a code has no account and no membership yet.

```jsonc
POST /api/auth/guest-login    // public
{
  "inviteToken": "b3f1…",     // straight from the resolve response
  "displayName": "Maria",     // whatever the guest typed on your join form
  "guestKey": "9f2e-…"        // see below
}
```

Then route by `targetType`: `EVENT_JOIN` → event home, `MEDIA_UPLOAD` → gallery upload,
`INVITATION` → the existing invite onboarding page (which can still call
`GET /api/event-invitations/{inviteToken}/preview` for the personalised prefill).

---

## What changed in guest login

**This affects the existing invite flow, not only QR codes.**

`POST /api/auth/guest-login` now takes an optional `guestKey`: an opaque string you generate once
per device and keep in `localStorage`.

```ts
function guestKey(): string {
  let key = localStorage.getItem('guestKey');
  if (!key) {
    key = crypto.randomUUID();
    localStorage.setItem('guestKey', key);
  }
  return key;
}
```

**Send it on every guest-login.** It is *required* whenever the invitation admits more than one
guest — which is every QR link — and omitting it there is a `400`. For a one-person invitation it's
optional and the old behaviour is unchanged, but there's no reason not to send it always.

### Why it exists

Before this, the backend resolved a returning guest by looking up "the member created from this
invitation" — one row. With a personal emailed invite that was correct. With a poster on a wall it
meant the **second person to scan was logged in as the first person**: their account, their name,
their membership. The `guestKey` is what tells two scanners of the same code apart.

It is **not a credential** and grants nothing on its own — the invite token is still the gate. It
only selects among the memberships that token already covers. Don't treat it as a secret, but do
keep it stable: a guest who loses it and rescans becomes a new guest and burns another slot.

### `maxGuests` is now enforced

It has been a column on `event_invitations` since day one and was never checked. It is now, at the
moment a membership is created:

```jsonc
// 409 Conflict
{ "status": 409, "errorCode": 5035, "errorKey": "INVITATION_EXHAUSTED",
  "detail": "This invite link has already been used by the maximum number of guests." }
```

A slot is consumed **when someone joins, not when they scan**. Resolving a QR costs nothing, so a
code that's been photographed a thousand times still admits its full complement of actual guests.
A guest the host later removes hands their slot back.

Distinguish this from `5009 EVENT_MEMBER_LIMIT_EXCEEDED`, which is the event's plan quota: `5035`
means the host should raise the link's limit or issue another link, `5009` means they need a bigger
plan.

## New error codes

| code | key | HTTP | when |
|---|---|---|---|
| 2004 | `QR_LINK_NOT_FOUND` | 404 | the scanned token was never issued |
| 5035 | `INVITATION_EXHAUSTED` | 409 | the link's `maxGuests` is used up |

### TypeScript

Full shapes are in `docs/frontend-api-types.ts` under `// ---- Dynamic QR links ----`:
`QrTargetType`, `QrLinkStatus`, `QrLinkRequestDto`, `QrLinkPatchDto`, `QrLinkResponseDto`,
`QrLinkResolutionDto`. `GuestLoginRequestDto` in the same file now carries `guestKey?`.

The resolution DTO is a discriminated union in practice — narrow on `status` before touching
anything but `status` and `targetType`:

```ts
const res = await fetch(`/api/qr/${token}`);          // no Authorization header
if (res.status === 404) return showUnknownCode();
const qr: QrLinkResolutionDto = await res.json();

switch (qr.status) {
  case 'ACTIVE':
    return startJoinFlow(qr);            // qr.inviteToken, qr.eventTitle etc. are set here
  case 'REVOKED':
    return showMessage('This code is no longer active.');
  case 'EXPIRED':
    return showMessage('This code has expired.');
  case 'TARGET_UNAVAILABLE':
    return showMessage("This event isn't available.");
}
```

## Checklist

- [ ] Add a `/q/:token` route that calls `GET /api/qr/{token}` with **no** auth header.
- [ ] Branch on all five outcomes: `ACTIVE`, `REVOKED`, `EXPIRED`, `TARGET_UNAVAILABLE`, and 404.
- [ ] Route `ACTIVE` by `targetType` after guest-login completes.
- [ ] Implement `guestKey()` and send it on **every** `guest-login` call, including the existing
      invite-link flow.
- [ ] Handle `400` on guest-login (missing `guestKey`) and `409` `5035` (link full).
- [ ] Host UI: create QR links, render `publicUrl` with a QR library, offer download + print.
- [ ] Host UI: list links with `label`, show revoked/expired state, offer revoke (not delete) for
      anything already printed.
- [ ] Host UI: allow repointing `targetType` — and make clear in the copy that the printed code
      keeps working.
- [ ] Render `publicUrl` verbatim. Do not build the URL from `token` yourself.
- [ ] Grey out upload CTAs when `eventStatus` is `FROZEN`.
- [ ] Don't log or send `token` / `inviteToken` to analytics.
