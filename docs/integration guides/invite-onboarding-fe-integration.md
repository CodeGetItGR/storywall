# FE integration guide: invite onboarding page

Covers two flows:
- **Part A** — the host-only UI for creating/managing invitations for an event.
- **Part B** — the public onboarding page a visitor lands on after scanning a QR code /
  opening an invite link, where they join as a guest, log in, or register.

Build Part A first — it's how you'll generate real `inviteToken`s to test Part B with,
instead of inserting rows manually.

> **Updated 2026-09-04 — breaking.** `POST /api/auth/guest-login` is **removed** (404 now).
> Part B step 2 below ("Join as guest") no longer exists — read
> [invite-redemption-and-anonymous-upload-fe-changelog.md](invite-redemption-and-anonymous-upload-fe-changelog.md)
> §1 first. The replacement: attach `inviteToken` directly to `register`/`login`/`oauth` instead
> of a separate guest step.

> **Updated 2026-08-22.** `guestKey` is now **server-generated**, not client-generated.
> Stop minting one with `crypto.randomUUID()` and stop sending it on a guest's first
> visit — omit it, and read the one the server returns in the guest-login response
> instead. This is **breaking** for any shared invitation flow: see
> [Shared invite links and `guestKey`](#shared-invite-links-and-guestkey).
>
> **Updated 2026-08-16.** Invitations now carry a `role`, and a second kind exists: a
> **co-host invitation**, created at `POST /api/events/{eventId}/host-invitations` and
> accepted through the same `accept` endpoint, but only by the exact address it names on a
> verified account. See [Co-host invitations](#co-host-invitations) in Part A and the new
> `403`/`5044` case in Part B step 3.

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
                              // (enforced since 2026-08-11; >1 means guest-login returns a guestKey)
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
  "createdAt": "2026-07-31T...",
  "role": "ATTENDEE"
}
```

`role` was added 2026-08-16 and is `"ATTENDEE"` for everything this endpoint creates. The other
value, `"HOST"`, comes from the co-host endpoint below.
Build the shareable link/QR as `https://your-app/invite/{inviteToken}` and/or the
human-readable `inviteCode` for print materials.

Error cases:
- `409 Conflict` — `inviteCode` already used for this event.
- `400 Bad Request`, `errorCode: 3001` — validation failure (e.g. missing `inviteCode`),
  with field errors under `errors.<fieldName>`.

### Co-host invitations

*New 2026-08-16.* Asks somebody to **co-host** rather than attend. Use this when the host knows a
person by email address; use `POST /api/events/{eventId}/hosts` (`{ userId }`) when they are
already a registered user whose id you hold and the host wants to promote them **immediately**,
with no acceptance step. Both paths end at the same `EventHost` row.

```
POST /api/events/{eventId}/host-invitations
Authorization: Bearer {accessToken}

{
  "email": "sam@example.com",          // REQUIRED here, unlike a guest invitation
  "firstName": "Sam",                  // optional, max 100
  "lastName": "Ng",                    // optional, max 100
  "expiresAt": "2026-09-01T00:00:00Z"  // optional, null = never expires
}
```

Returns the same `EventInvitationResponseDto`, with `role: "HOST"`. Note what you **don't** send:

- no `inviteCode` — the server mints one, prefixed `COHOST-`;
- no `maxGuests` — pinned to `1`, because acceptance is bound to one named address. Don't offer
  the control, and don't offer a `PATCH` that raises it.

An email ("You've been invited to co-host {event}") goes out automatically; there is no separate
send step.

`409` if that address already belongs to a member of the event — they have nothing to accept, so
promote them with `POST /api/events/{eventId}/hosts` instead. Surface that as a redirect to the
promote action rather than a raw error.

**The acceptance rule.** A co-host invitation can only be accepted by the exact address it names,
on a **verified** account — see Part B step 3. Guest invitations are unchanged and stay forwardable;
this one is not.

**The preview endpoint does not expose `role`,** deliberately: it is public, and telling an unknown
visitor that a link is a live co-host invitation is the disclosure the `5044` error is worded to
avoid. Two consequences for the onboarding page, and the co-host email points at the same
`/invite/{token}` route the guest one does:

- The page cannot tell the two kinds apart, so it will offer "Join as guest" on a co-host link.
- A co-host who takes that option becomes an ordinary **attendee** — guest login never grants
  `HOST` — **and consumes the invitation's only slot**, so their real acceptance then fails with
  `5035 INVITATION_EXHAUSTED` and the host has to issue a fresh invitation.

Until the backend distinguishes them, the mitigation is copy: the email already says "you'll need
to sign in with this email address", so make the sign-in option the visually primary one on that
page rather than the guest shortcut.

### List invitations for an event

```
GET /api/events/{eventId}/invitations
Authorization: Bearer {accessToken}
```
→ `EventInvitationResponseDto[]` — use this to render the host's "manage invitations" table
(who's been invited, `usedAt` to show claimed/unclaimed, etc). Host-only; carries PII
(email/name) and tokens, so never expose this list to non-hosts.

**This returns both kinds.** Since 2026-08-16 co-host invitations come back in the same array —
split on `role` (`"HOST"` vs `"ATTENDEE"`) or they will appear among the guests, with a
`maxGuests` of 1 and a `COHOST-` code that looks like a mistake.

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

### 2. Join by creating or signing into a real account

**"Join as guest" is gone.** There is no account-free way to join an event anymore — every
visitor who wants to be a member goes through register, login, or OAuth, same as anywhere else
in the app. See
[invite-redemption-and-anonymous-upload-fe-changelog.md](invite-redemption-and-anonymous-upload-fe-changelog.md)
§1 for the full rationale. The mechanics: `RegisterRequestDto`, `LoginRequestDto`, and
`OAuthLoginRequestDto` each carry an optional `inviteToken`:

```json
POST /api/auth/register
{ "email": "...", "password": "...", "firstName": "Taylor", "lastName": "Smith", "inviteToken": "b3f1...uuid" }
```
```json
POST /api/auth/login
{ "email": "...", "password": "...", "inviteToken": "b3f1...uuid" }
```
```json
POST /api/auth/oauth/{provider}
{ "idToken": "...", "inviteToken": "b3f1...uuid" }
```

Each returns the normal `AuthResponseDto` for that flow — nothing new in the response shape.
**Redemption is best-effort and silent**: an invalid, expired, or exhausted `inviteToken` never
fails the auth call itself, and the response gives no signal either way about whether the
visitor actually got joined. Don't render "you're in" off the auth response — either redirect to
the event and let its own membership check handle a non-member, or explicitly re-check
membership after auth if you need a confirmation before redirecting. Full detail in the
changelog doc linked above.

There is no `guestKey` anywhere in this flow. Delete any `storedGuestKey()` / `localStorage`
guest-key handling this page had — it has nothing left to talk to.

#### `maxGuests` is still enforced

It has been a column since day one and was checked nowhere. It is now checked at the moment
a membership is created — by the `inviteToken` redemption in step 2 above **and** by `accept`
below, so an account holder can't walk past a full link:

```json
{ "status": 409, "errorCode": 5035, "errorKey": "INVITATION_EXHAUSTED",
  "detail": "This invite link has already been used by the maximum number of guests." }
```

A slot is consumed on **join**, not on preview or scan. A guest the host later removes gives
their slot back. Don't confuse this with `5009 EVENT_MEMBER_LIMIT_EXCEEDED`, which is the
event's plan quota: `5035` means raise this link's `maxGuests` or issue another link, `5009`
means the host needs a bigger plan. Raise the limit with `PATCH /api/event-invitations/{id}`
for an invitation the host created, or `PATCH /api/qr-links/{id}` for one behind a QR code.

### 3. Log in with an existing account, then join

Either attach `inviteToken` directly to `login` (step 2 above) and let redemption happen
silently, or — if you want an explicit success/failure signal instead of a silent best-effort
join — log in without it and call `accept` separately:

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

On a **co-host** invitation (`role: "HOST"`) the same call additionally creates the `EventHost`
row, so the caller appears in `EventDetailResponseDto.hosts` immediately. Nothing about the
request differs — the endpoint is the same.

Possible responses from `accept`:
- `409 Conflict`, `errorCode: 5001` — caller is already a member of this event. Treat as
  success (they're in); don't surface this as an error to the user.
- `409 Conflict`, `errorCode: 5035` — the link's `maxGuests` is used up. This one *is* an
  error: they're not in. Show "this invite link is full".
- `410 Gone` — invitation has expired since the preview was loaded.
- `403 Forbidden`, `errorCode: 5044` `CO_HOST_INVITE_NOT_YOURS` — **co-host invitations only.**
  The signed-in account's email doesn't match the address the invitation names, *or* it matches
  but the address is unverified. See below.

#### Handling `5044`

The response deliberately does not say which of the two conditions failed — a stranger holding a
forwarded link must not learn that it is a live co-host invitation worth pursuing. So you cannot
render "please verify your email" off the error alone. Branch on state you already hold:

```ts
if (err.errorCode === 5044) {
  if (!currentUser.emailVerified) {
    show('Verify your email address first, then open this link again.');
    offerResendVerification();
  } else {
    show('This invitation was sent to a different account. Sign in with the address it was sent to.');
  }
}
```

`5044` is checked **last**, after expiry, already-a-member, `maxGuests`, and the event's member
quota. So an expired or exhausted co-host link returns the ordinary `410`/`5035` rather than
`5044`, and any of those is a terminal state for that link regardless of who is signed in.

### 4. Register a new account, then join

Same as login: either attach `inviteToken` to `register` (step 2), or register without it and
call `accept` separately with the returned `accessToken` for an explicit result.

### Suggested page flow

```
1. GET preview(token) on page load
   - expired/alreadyUsed/404 → render terminal state, stop
   - else → render branded page with 2 options (no "join as guest" anymore)
2. User picks:
   a. "I have an account" → POST /auth/login  { inviteToken }  → redirect, let event page confirm membership
   b. "Create an account" → POST /auth/register  { inviteToken }  → redirect, let event page confirm membership
3. If you want an explicit in-page confirmation instead of a silent redirect, omit inviteToken
   from 2a/2b and call POST /event-invitations/{token}/accept afterward instead — it can return
   409/5035 ("this invite link is full") or 403/5044 (co-host link, wrong/unverified account).
```

No other endpoints are needed for this flow; both options reuse the existing auth endpoints.
