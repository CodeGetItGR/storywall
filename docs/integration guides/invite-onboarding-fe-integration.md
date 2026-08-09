# FE integration guide: invite onboarding page

Covers two flows:
- **Part A** — the host-only UI for creating/managing invitations for an event.
- **Part B** — the public onboarding page a visitor lands on after scanning a QR code /
  opening an invite link, where they join as a guest, log in, or register.

Build Part A first — it's how you'll generate real `inviteToken`s to test Part B with,
instead of inserting rows manually.

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
  "displayName": "Taylor Smith"
}
```

- Unauthenticated. On success, creates (or re-authenticates) a guest account and an
  `EventMember` for the event, returns a scoped JWT (`accessToken`, `refreshToken: null`).
- Idempotent per token — calling it again with the same `inviteToken` re-issues a token for
  the same guest identity rather than creating a duplicate.
- Store `accessToken` and use it for subsequent event-scoped requests. There is no refresh
  flow for guests — if the token expires (24h), re-run guest-login with the same invite link.

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
- `409 Conflict` — caller is already a member of this event. Treat as success (they're in);
  don't surface this as an error to the user.
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
   a. "Join as guest"   → POST /auth/guest-login          → done
   b. "I have an account" → POST /auth/login  → POST /event-invitations/{token}/accept → done
   c. "Create an account" → POST /auth/register → POST /event-invitations/{token}/accept → done
```

No other endpoints are needed for this flow; steps 2b/2c reuse the existing auth endpoints
unchanged.
