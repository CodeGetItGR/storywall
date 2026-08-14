# FE integration guide: invite onboarding page

Covers two flows:

- **Part A** — the host-only UI for creating/managing invitations for an event.
- **Part B** — the public onboarding page a visitor lands on after scanning a QR code /
  opening an invite link, where they join as a guest, log in, or register.

Build Part A first — it's how you'll generate real `inviteToken`s to test Part B with,
instead of inserting rows manually.

> **Updated 2026-08-11.** Guest login now takes a `guestKey`, and `maxGuests` is now
> actually enforced. Both are **breaking for any invitation with `maxGuests > 1`** —
> see [Shared invite links and `guestKey`](#shared-invite-links-and-guestkey). If you are
> also building the QR-code UI, read `qr-links-fe-integration.md`, which uses this same
> guest-login call.

## Part A — host-only invitation management

All endpoints below require `Authorization: Bearer {accessToken}` for a user who is a
**host** of the target event (not just any logged-in user) — enforced server-side via
`ROLE_USER` + a per-event host check. A non-host caller gets `403` with `errorCode: 4001`.

### Create an invitation

```
POST /api/event-invitations
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "eventId": "a1c2...uuid",   // required
  "inviteCode": "TABLE-7",    // required, non-blank, max 100 chars, unique per event
  "maxGuests": 5,             // required, positive int — how many joins this link allows
                              // (enforced since 2026-08-11; >1 means guests must send a guestKey)
  "email": "taylor@example.com",   // optional, prefill
  "firstName": "Taylor",           // optional, prefill
  "lastName": "Smith",             // optional, prefill
  "expiresAt": "2026-09-01T00:00:00Z"  // optional, null = never expires
}
```

`inviteCode` is the one field that's easy to miss — the entity has no DB default for it
(unlike `inviteToken`, which is auto-generated), so it's required even though it's mostly
a host-facing label (e.g. for printed QR codes: "TABLE-7", "VIP"). Any string works if
you don't need it to be meaningful — it just has to be unique within the event.

**201 response** (`EventInvitationResponseDto`) — this is where you get the token to build
the invite link from:

```json
{
    "id": "e5f6...uuid",
    "eventId": "a1c2...uuid",
    "inviteCode": "TABLE-7",
    "inviteToken": "b3f1...uuid",
    "email": "taylor@example.com",
    "firstName": "Taylor",
    "lastName": "Smith",
    "maxGuests": 5,
    "expiresAt": "2026-09-01T00:00:00Z",
    "usedAt": null,
    "createdAt": "2026-07-31T..."
}
```

Build the shareable link/QR as `https://your-app/invite/{inviteToken}` and/or the
human-readable `inviteCode` for print materials.

Error cases:

- `409 Conflict` — `inviteCode` already used for this event.
- `400 Bad Request`, `errorCode: 3001` — validation failure (e.g. missing `inviteCode`),
  with field errors under `errors.<fieldName>`.

### List invitations for an event

```
GET /api/events/{eventId}/invitations
Authorization: Bearer {accessToken}
```

→ `EventInvitationResponseDto[]` — use this to render the host's "manage invitations" table
(who's been invited, `usedAt` to show claimed/unclaimed, etc). Host-only; carries PII
(email/name) and tokens, so never expose this list to non-hosts.

Invitations the backend generates to back a shared QR code are **excluded** from this list —
they have no recipient and would otherwise appear as anonymous `QR-AB12CD34` rows among real
guests. They're managed through `/api/qr-links` instead. An invitation you created yourself
stays listed even if a QR code points at it.

### Get a single invitation (by id, not token)

```
GET /api/event-invitations/{id}
Authorization: Bearer {accessToken}
```

Same DTO as above. Note this takes the invitation's own `id`, not the `inviteToken` — use
this for an edit screen you navigated to from the list above.

### Update an invitation

```
PATCH /api/event-invitations/{id}
Authorization: Bearer {accessToken}

{ "maxGuests": 10 }
```

Partial update — `firstName`, `lastName`, `email`, `maxGuests`, `expiresAt` are all
independently optional; omitted fields are left unchanged. `inviteCode` and `inviteToken`
are not patchable (immutable after creation).

### Delete (revoke) an invitation

```
DELETE /api/event-invitations/{id}
Authorization: Bearer {accessToken}
```

Immediately invalidates the link — the preview/guest-login/accept endpoints below will all
404 for that token afterward.

## Part B — public onboarding page

Covers the flow where a visitor scans a QR code or opens an invite link and lands on a
per-event onboarding page, then chooses to join as a guest, log in, or register.

### 1. Load the invitation preview (unauthenticated)

```
GET /api/event-invitations/{inviteToken}/preview
```

- No `Authorization` header required — publicly reachable.
- `inviteToken` is the UUID embedded in the invite link/QR code.

**200 response** (`EventInvitationPreviewDto`):

```json
{
    "inviteToken": "b3f1...uuid",
    "eventId": "a1c2...uuid",
    "eventTitle": "Alex & Jamie's Wedding",
    "eventSubtitle": "Join us for the big day",
    "eventDescription": "...",
    "coverMediaId": "d4e5...uuid",
    "firstName": "Taylor",
    "lastName": "Smith",
    "email": "taylor@example.com",
    "expired": false,
    "alreadyUsed": false
}
```

- `firstName` / `lastName` / `email` are pre-fill values from the invitation, if the host
  set them when creating it — otherwise `null`.
- `expired: true` / `alreadyUsed: true` are **not** errors — render the page's expired/used
  state instead of the join options. (`alreadyUsed` just means the invite link's single-use
  slot was already claimed; it does not necessarily mean the current visitor is the one who
  claimed it.)
- `coverMediaId` — resolve to a URL the same way the rest of the app resolves event cover
  media (check how `EventResponseDto.coverMediaId` is already handled on other event pages).
- **404** if the token doesn't exist at all — show a generic "invalid invite" state.

Use this response to render the branded onboarding page (title, subtitle, description,
cover image) before showing any join options.

### 2. Join as guest (no account)

```
POST /api/auth/guest-login
{
  "inviteToken": "b3f1...uuid",
  "displayName": "Taylor Smith",
  "guestKey": "9f2e-...",     // optional field, but send it always — see below
}
```

- Unauthenticated. On success, creates (or re-authenticates) a guest account and an
  `EventMember` for the event, returns a scoped JWT (`accessToken`, `refreshToken: null`).
- Idempotent per `(inviteToken, guestKey)` pair — calling it again with the same values
  re-issues a token for the same guest identity rather than creating a duplicate.
- Store `accessToken` and use it for subsequent event-scoped requests. There is no refresh
  flow for guests — if the token expires (24h), re-run guest-login with the same invite link.

#### Shared invite links and `guestKey`

`guestKey` is an opaque string you generate once per device and keep in `localStorage`:

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

**When it's required:** whenever the invitation's `maxGuests > 1`, and also behind any QR
code — those are shared even when set to a single guest, so `maxGuests` alone doesn't
answer it. Omitting it where it's required is a `400`. For a personal one-person invitation
it's optional and the previous behaviour is unchanged — but send it unconditionally and you
never have to branch. (In the QR flow, the resolve response tells you outright via
`requiresGuestKey`; see `qr-links-fe-integration.md`.)

**Why it exists.** The backend used to resolve a returning guest as "the member created from
this invitation" — a single row. For a personal emailed invite that was right. For a link
shared with a whole table it meant the _second_ person to open it was logged in **as the
first**: their account, their name, their membership. `guestKey` is what tells two users of
the same link apart.

It is **not a credential** and grants nothing by itself — the `inviteToken` is still the
gate. It only picks which membership under that invitation belongs to this device. Don't
treat it as a secret, but do keep it stable: a guest who clears it and returns becomes a new
guest and consumes another slot.

#### `maxGuests` is now enforced

It has been a column since day one and was checked nowhere. It is now checked at the moment
a membership is created — by `guest-login` **and** by `accept` below, so an account holder
can't walk past a full link:

```json
{
    "status": 409,
    "errorCode": 5035,
    "errorKey": "INVITATION_EXHAUSTED",
    "detail": "This invite link has already been used by the maximum number of guests."
}
```

A slot is consumed on **join**, not on preview or scan. A guest the host later removes gives
their slot back. Don't confuse this with `5009 EVENT_MEMBER_LIMIT_EXCEEDED`, which is the
event's plan quota: `5035` means raise this link's `maxGuests` or issue another link, `5009`
means the host needs a bigger plan. Raise the limit with `PATCH /api/event-invitations/{id}`
for an invitation the host created, or `PATCH /api/qr-links/{id}` for one behind a QR code.

### 3. Log in with an existing account, then join

```
POST /api/auth/login
{ "email": "...", "password": "..." }
```

→ returns `accessToken` / `refreshToken`.

Then, using that `accessToken`:

```
POST /api/event-invitations/{inviteToken}/accept
Authorization: Bearer {accessToken}
```

→ creates an `EventMember` linking the existing user to the event and returns the member
record. Order matters: **log in first, accept second** — `accept` requires `ROLE_USER`.

Possible responses from `accept`:

- `409 Conflict`, `errorCode: 5001` — caller is already a member of this event. Treat as
  success (they're in); don't surface this as an error to the user.
- `409 Conflict`, `errorCode: 5035` — the link's `maxGuests` is used up. This one _is_ an
  error: they're not in. Show "this invite link is full".
- `410 Gone` — invitation has expired since the preview was loaded.

### 4. Register a new account, then join

Same shape as login: `POST /api/auth/register` → then `POST /api/event-invitations/{inviteToken}/accept`
with the returned `accessToken`.

### Suggested page flow

```
1. GET preview(token) on page load
   - expired/alreadyUsed/404 → render terminal state, stop
   - else → render branded page with 3 options
2. User picks:
   a. "Join as guest"   → POST /auth/guest-login  { guestKey: guestKey() }  → done
   b. "I have an account" → POST /auth/login  → POST /event-invitations/{token}/accept → done
   c. "Create an account" → POST /auth/register → POST /event-invitations/{token}/accept → done
3. Any of the three can come back 409 / 5035 → "this invite link is full"
```

No other endpoints are needed for this flow; steps 2b/2c reuse the existing auth endpoints
unchanged.
