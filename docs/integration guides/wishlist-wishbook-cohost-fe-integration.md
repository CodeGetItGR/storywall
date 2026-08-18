# FE integration guide: co-host invitations, paid module unlocks, wishlist, wishbook

Covers four changes shipped together on 2026-08-16. See
[`frontend-integration-guide.md`](frontend-integration-guide.md) §0 for base setup (auth header,
the RFC 7807 error envelope, `Page<T>` shape) and [`billing-fe-guide.md`](billing-fe-guide.md) for
everything plan- and payment-related — this doc only covers what is new.

Two new modules exist (`wishlist`, `wishbook`), co-host invitations became a real pending
invitation flow rather than only an immediate promotion, and paid services can now grant a module.

**One deployment prerequisite:** the backend will not start without `FIELD_ENCRYPTION_KEY` set. If
staging suddenly 502s after this deploy, that is why — see
[`../deployment-checklist.md`](../deployment-checklist.md) §1.

The master references have been updated in place for all of this, so you can build from them
directly and use this doc for the "why": wire shapes in
[`../frontend-api-types.ts`](../frontend-api-types.ts), endpoints and lifecycle rules in
[`frontend-integration-guide.md`](frontend-integration-guide.md), everything commercial in
[`billing-fe-guide.md`](billing-fe-guide.md) §4/§7c/§13, the config payload in
[`app-config-fe-integration.md`](app-config-fe-integration.md), and the invitation flows in
[`invite-onboarding-fe-integration.md`](invite-onboarding-fe-integration.md).

---

## 0. What you can skip

If you render modules generically off `GET /api/config` → `eventModuleKeys` and
`EventDetailResponseDto.modules[].isAvailable`, the two new modules appear on their own and the
only work is building the two new screens. Nothing about existing modules changed.

If you hardcoded the five module keys anywhere, that list is now seven:
`posts`, `rsvp`, `playlist`, `stories`, `gallery`, `wishlist`, `wishbook`.

---

## 1. Co-host invitations

### What changed

Promotion of an existing account still works exactly as before:

```
POST /api/events/{eventId}/hosts     { "userId": "..." }    // CoHostInviteRequestDto
```

Note that it takes a **`userId`** — it only works for somebody who already has an account and whose
id you already hold. That is the gap the new flow fills.

New: a **pending invitation** addressed to an email, for somebody who has no account yet, or who you
would rather not promote until they accept.

```
POST /api/events/{eventId}/host-invitations      // host only
```

```ts
interface CoHostInvitationRequestDto {
    email: string; // required, max 255 — NOT optional, unlike guest invitations
    firstName?: string; // max 100
    lastName?: string; // max 100
    expiresAt?: string; // ISO-8601; omit for an invitation that never expires
}
```

Returns `EventInvitationResponseDto`, which has **one new field**:

```ts
interface EventInvitationResponseDto {
    // ...everything it had before, plus:
    role: 'HOST' | 'ATTENDEE'; // HOST = co-host invitation
}
```

The server pins `maxGuests: 1` and `shared: false` on these — don't send them, and don't offer the
controls. The invite code is prefixed `COHOST-` if you want to show it.

An email is sent automatically ("You've been invited to co-host {event}"). There is no separate
"send" step.

### The rule that will bite you

**A co-host invitation can only be accepted by the exact address it names, on a verified account.**
Ordinary guest invitations are unchanged — their `email` is a prefill hint and the link is meant to
be forwardable. A co-host link is not.

Acceptance is the same endpoint as before:

```
POST /api/event-invitations/{inviteToken}/accept
```

but for a `role: 'HOST'` invitation it now fails with **403 / `errorCode: 5044`
(`CO_HOST_INVITE_NOT_YOURS`)** when the signed-in account's email doesn't match, _or_ when it
matches but the address is unverified.

The response deliberately does not tell you which of the two it was — a stranger holding the link
must not learn that it is a live co-host invitation worth pursuing. So **you cannot render
"please verify your email" off the error alone.** Do this instead:

```ts
// You already know the caller's own verification state from the session/me payload.
if (err.errorCode === 5044) {
    if (!currentUser.emailVerified) {
        show('Verify your email address first, then open this link again.');
        offerResendVerification();
    } else {
        show('This invitation was sent to a different account. Sign in with the address it was sent to.');
    }
}
```

5044 is checked **last** — after expiry, already-a-member, `maxGuests`, and the event's member
quota — so an expired or exhausted co-host link returns the ordinary `410`/`5035` rather than 5044.

### The landing page cannot tell the two kinds apart

`GET /api/event-invitations/{inviteToken}/preview` is public and deliberately does **not** return
`role` — telling an unknown visitor that a link is a live co-host invitation is exactly the
disclosure 5044 is worded to avoid. The co-host email also points at the same `/invite/{token}`
route the guest one does. Two consequences:

- Your onboarding page will offer "Join as guest" on a co-host link.
- A co-host who takes that option becomes an ordinary **attendee** (guest login never grants HOST)
  **and burns the invitation's only slot**, so their real acceptance then fails with
  `5035 INVITATION_EXHAUSTED` and the host has to reissue.

Until the backend distinguishes them, the mitigation is copy: the email already says "you'll need
to sign in with this email address", so make the sign-in option the visually primary one rather
than the guest shortcut. Flagged as a known gap, not a thing you can detect client-side.

On success the caller becomes a member with `role: HOST` and gets an `EventHost` row — they appear
in `EventDetailResponseDto.hosts` immediately.

### Listing

`GET /api/events/{eventId}/invitations` returns both kinds. Filter on `role` to split "Guests" from
"Co-hosts" in the UI; without filtering, co-host invitations will appear in your guest-invite list.

---

## 2. Paid module unlocks

### What changed

A paid-service catalog entry can now grant a module. `PaidServiceKind` has a third value:

```ts
type PaidServiceKind = 'RECURRING_ADDON' | 'STORAGE_PACK' | 'MODULE_UNLOCK'; // MODULE_UNLOCK is new
```

and `PaidServiceResponseDto` / `PaidServiceRequestDto` / `PaidServicePatchDto` all gained:

```ts
grantsModuleKey: string | null; // required for MODULE_UNLOCK, must be null for the other kinds
```

These appear in `GET /api/config` → `paidServices` like any other public service.

### New host-facing endpoint

```
POST /api/events/{eventId}/addons        // host only, DRAFT events only
{ "paidServiceCode": "UNLOCK_WISHLIST" }
```

Returns the same `AddonSummary` shape `GET /api/events/{eventId}/billing` already returns in its
`addons` array:

```ts
interface AddonSummary {
    code: string;
    name: string;
    priceAmountMinor: number;
    activatedAt: string;
}
```

This is **not a checkout.** Nothing is charged at this moment — the price folds into the activation
order the host pays at the end of setup, and then into every monthly renewal. Show it as a toggle in
the draft setup flow, not as a purchase button.

It accepts `RECURRING_ADDON` and `MODULE_UNLOCK` codes. It rejects `STORAGE_PACK` codes with 400 —
storage is bought against a _live_ event through the existing
`POST /api/events/{eventId}/storage-checkout`.

Errors worth handling:

| Status | `errorCode`            | Meaning                                                        |
| ------ | ---------------------- | -------------------------------------------------------------- |
| 409    | `EVENT_NOT_DRAFT`      | the event is already live — see the limitation below           |
| 409    | `ADDON_ALREADY_ACTIVE` | already opted in; treat as success and refresh                 |
| 400    | —                      | wrong kind, unknown code, or not sellable on this event's plan |

### Limitation to design around

**Unlocks can only be bought while the event is a DRAFT.** There is no mid-cycle purchase path — that
would mean charging immediately, which is the checkout-and-reprice flow only storage packs have.

So the module picker belongs in the event setup wizard, before activation. On a live event, a module
the plan doesn't include should render as unavailable with no "buy" affordance. Don't build a
purchase CTA on the live event screen; it will always 409.

### Opting out

There is no host-facing route, deliberately. Entitlements are permanent for the life of the event.
`DELETE /api/admin/events/{eventId}/addons/{code}` exists for admins and refuses while the event is
`ACTIVE`.

### Admin panel

Both existing admin surfaces cover this with no new endpoints:

- `POST/PATCH /api/admin/paid-services` — create a `MODULE_UNLOCK` row, set `grantsModuleKey`, price
  it, toggle `isAssignable`/`isPublic`. Validation: `grantsModuleKey` must name a real module and
  must be `null` on the other two kinds; `MODULE_UNLOCK` must be `MONTHLY`.
- `PUT /api/admin/plan-tiers/{id}/modules` — set which modules a plan includes.

**The two combine as an OR, not an AND.** A module is commercially open to an event if its plan
includes it **or** it holds an unlock. So the way to sell a module is: remove it from the lower
plan tiers, then publish a `MODULE_UNLOCK` for it. Higher tiers that keep it in their module list
get it free with no unlock needed — which is the tiering model you asked for.

The platform kill switch (`PATCH /api/admin/platform-modules/{moduleKey}`, `isEnabled: false`) still overrides
everything. An unlock does not reopen a module withdrawn platform-wide.

---

## 3. Wishlist — one IBAN per event

The deliberately-minimal money-gift module. No named products, no per-item claiming, no "who gave
what". One optional bank account the host enters, that members can copy.

### Endpoints

```
GET    /api/events/{eventId}/gift-account      // any member, incl. guest tokens
PUT    /api/events/{eventId}/gift-account      // host only
DELETE /api/events/{eventId}/gift-account      // host only → 204
```

```ts
interface EventGiftAccountRequestDto {
    iban: string; // required, max 42 chars as typed (spaces allowed)
    accountHolder: string; // required, max 140
    note?: string; // max 500
}
// Two length limits, and they fail differently. Over 42 characters as typed is a bean-validation
// 400 with errors.iban; 42 or fewer but over 34 once spaces are stripped is a 400 / 5045, the same
// error a bad check digit gives. No real IBAN exceeds 34 normalised characters.

interface EventGiftAccountResponseDto {
    id: string;
    eventId: string;
    iban: string; // normalised: uppercase, no spaces
    accountHolder: string;
    note: string | null;
    updatedAt: string;
}
```

`PUT` is an upsert — there is at most one per event, so there is no create-vs-update distinction and
no need to GET first. Re-sending replaces.

### Things to get right

**404 is the normal empty state.** `GET` returns `404 EventGiftAccount` when the host hasn't set one
up. That is not an error to surface — render the empty state, or (for a host) the setup form.

**Format the IBAN for display, send it however the user typed it.** The server normalises
(`de89 3704 0044 0532 0130 00` → `DE89370400440532013000`). Group it in fours when you show it, and
give guests a copy button — an IBAN transcribed by hand is an IBAN sent to the wrong account.

**Handle 400 / `errorCode: 5045` (`INVALID_IBAN`).** The server runs the ISO 13616 mod-97 check.
This fires on a transposed digit, which is the realistic mistake and the one worth catching loudly.
Put the error on the field, not in a toast.

**Do not cache or persist the IBAN outside the current view.** It is served only to members, kept off
`GET /api/events/{id}` entirely (anonymous QR scanners hit that endpoint), and stored encrypted at
rest server-side. Don't undo that by putting it in localStorage, a URL, or an analytics event.

### Lifecycle

Unlike every other module write path, the host can configure this while the event is still a
**DRAFT** — it belongs in the setup wizard alongside the other event details, before payment. It
also stays editable when an event is `FROZEN`, so a host sorting out a lapsed payment can still fix
a mistyped IBAN.

Reading is member-gated only, with no lifecycle check: guests of a frozen event can still see where
to send a gift.

Availability still applies — if the plan doesn't include `wishlist` and there is no unlock, `PUT`
returns 409 `MODULE_NOT_AVAILABLE`.

---

## 4. Wishbook — written wishes

A guestbook. Every member can read every wish; that is the point, and it is what separates it from a
private message to the hosts.

### Endpoints

```
GET    /api/events/{eventId}/wishbook           // Page<WishbookEntryResponseDto>, newest first
GET    /api/events/{eventId}/wishbook/count     // plain number, for a summary card
POST   /api/events/{eventId}/wishbook           // any member, incl. guest tokens
DELETE /api/wishbook/{entryId}                  // author or host → 204
```

```ts
interface WishbookEntryRequestDto {
    message: string; // required, max 2000
    guestName?: string; // max 120; defaults to the member's display name
}

interface WishbookEntryResponseDto {
    id: string;
    eventId: string;
    authorMemberId: string | null; // null once the author's membership is removed
    guestName: string;
    message: string;
    createdAt: string;
    canDelete: boolean; // read this instead of computing it yourself
}
```

Note the delete route is **not** nested under the event — it takes the entry id directly.

### Things to get right

**Use `canDelete` to decide whether to draw the delete control.** It is true for the caller's own
wishes and true for everything if the caller is a host. Computing it client-side from
`authorMemberId` will get the host case wrong.

**It's a `Page<T>`, not an array.** `content` / `totalElements` / `totalPages` / `number` / `size`.
Default page size 20, newest first. Standard `?page=&size=` params.

**Guests can write.** `isAuthenticated()`, not `hasRole('USER')` — an event-scoped guest token is
exactly who this is for. The event id comes from the path and membership is checked against it, so
there is no request-body event id to worry about.

**Multiple wishes per guest are allowed** by design — a couple sharing one phone would otherwise get
one wish between them. If you want a one-per-guest UI, that is your choice to enforce; the backend
won't.

**Escape the message and `guestName` on render.** Both are free text from guests. React/Vue escape
by default; if you use `dangerouslySetInnerHTML`, `v-html`, or render into a canvas/PDF, don't.

### Lifecycle

Writing requires the event to be `ACTIVE`. A frozen event returns **409 `EVENT_FROZEN`** ("renew to
make changes") and a not-yet-paid draft returns **409 `EVENT_NOT_ACTIVE`** — two different remedies,
so branch on the code rather than showing one generic message. Either way, render a read-only
wishbook rather than a disabled-looking compose box with no explanation.

Deleting works regardless of event state, so a host can still take down something offensive after
the event freezes. Deletion is soft server-side, but removed wishes never come back from the API —
treat it as gone.

---

## 5. New error codes

| Code | Key                        | Status | Where                                                               |
| ---- | -------------------------- | ------ | ------------------------------------------------------------------- |
| 5044 | `CO_HOST_INVITE_NOT_YOURS` | 403    | accepting a co-host invitation with the wrong or unverified account |
| 5045 | `INVALID_IBAN`             | 400    | saving a gift account whose IBAN fails its check digits             |

Both follow the standard envelope — `errorCode` (number) and `errorKey` (string) on the RFC 7807
body. Existing codes reused by these features: `MODULE_NOT_AVAILABLE`, `EVENT_FROZEN`,
`EVENT_NOT_ACTIVE`, `EVENT_NOT_DRAFT`, `ADDON_ALREADY_ACTIVE`, `FORBIDDEN` (4001).

---

## 6. Suggested build order

1. **Widen the module key list** if you hardcoded it, and confirm the two new modules render as
   unavailable-but-known. Nothing else breaks without this, but everything else depends on it.
2. **Wishbook** — the least conditional of the four. A list, a compose box, a delete control driven
   by `canDelete`.
3. **Wishlist** — small, but needs the 404 empty state, the field-level 5045, and IBAN grouping.
4. **Co-host invitations** — mostly a new form plus the `role` filter on the existing invitation
   list; the real work is the 5044 branch on the accept screen.
5. **Module unlocks** — last, because it only makes sense once an admin has actually published a
   `MODULE_UNLOCK` row, and it lives in the draft setup wizard rather than any live-event screen.
