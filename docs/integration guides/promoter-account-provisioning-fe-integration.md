# FE integration: admin-provisioned promoter accounts and events

Shipped 2026-09-20. Two new admin-only endpoints, plus one new field on the existing user admin
endpoints. Nothing here is reachable by a normal (non-admin) user, so no self-service UI is
affected — this is purely for whatever internal admin tool creates and manages promoter accounts.

## Why this exists

The platform wants to hand fully working accounts to people who will promote the product, without
those people ever going through registration or event creation themselves. An admin creates the
account, an admin creates the event (already pinned to a plan, already live), and an admin can
lock the account out of creating any further events of its own.

There is **no account-level plan** involved — account-scope plans are disabled platform-wide (see
the existing `ACCOUNT_PLANS_DISABLED` behavior on `PATCH /api/admin/users/{id}/plan-tier`). Only
the **event** gets a plan tier, exactly like every other event.

## What's new

### 1. `POST /api/users/provisioned` — create an account with no self-registration

```
POST /api/users/provisioned
Authorization: Bearer <admin JWT>
Content-Type: application/json

{
  "email": "promoter@example.com",
  "firstName": "Ada",
  "lastName": "Promoter"
}
```

Returns a `UserResponseDto` (same shape as `GET /api/users/{id}`), `201`-equivalent `200 OK`.

- No password field — there is none to send. The account is created `ACTIVE`, `authProvider:
  LOCAL`, already **email-verified** (there's no address to prove; the admin is vouching for the
  account directly), and is immediately mailed a "set your password" link through the same flow
  `POST /api/auth/forgot-password` uses. The promoter clicks the link, sets their own password,
  and can log in normally from then on — no invite-token UI needed on your side for this step.
- `409` if the email is already registered (generic conflict, no dedicated error code — treat like
  any other "already exists" response).
- `eventCreationLocked` on the response defaults to `false`.

**Do this:** if you're building an admin panel for this, the form is just email/first/last name —
no password field, no "send invite" button, the reset email goes out automatically.

### 2. `eventCreationLocked` — block an account from self-service event creation

Added to both `UserRequestDto` (the body of `PATCH /api/users/{id}`) and `UserResponseDto`.

```
PATCH /api/users/{id}
{ "eventCreationLocked": true }
```

- When `true`, that account's own `POST /api/events` calls are rejected with `409` /
  `errorCode: 5075` (`error.event_creation_locked`).
- **Does not** affect events an admin creates on the account's behalf via the new
  `POST /api/admin/events` below — that endpoint never checks this flag. The lock only closes the
  self-service door; the admin-provisioning door stays open regardless.
- Defaults to `false` for every account, including ones created by ordinary registration —
  existing accounts are completely unaffected until an admin explicitly sets it.

**Do this:** if your admin user-detail screen has a status/role toggle area, add a switch for this
next to the existing status/role controls — it's just another field on the same `PATCH`.

### 3. `POST /api/admin/events` — create a fully-scaffolded, live event for someone else

```
POST /api/admin/events
Authorization: Bearer <admin JWT>
Content-Type: application/json

{
  "hostUserId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "event": {
    "title": "Summer Launch Party",
    "eventType": "WEDDING",
    "visibility": "PRIVATE",
    "startAt": "2027-01-01T18:00:00Z",
    "endAt": "2027-01-01T23:00:00Z",
    "timezone": "Europe/Athens",
    "locationName": "Venue Name",
    "brandingSettings": {},
    "planTierCode": "PROMO-GRANT"
  }
}
```

- `event` is the **exact same shape** as the body of the existing `POST /api/events` — every
  field, every validation rule (title, eventType, dates, timezone, brandingSettings, planTierCode,
  etc.) is identical. The only addition is the top-level `hostUserId`.
- Returns an `EventResponseDto`, same shape as `POST /api/events`'s response — but the event comes
  back with `status: "ACTIVE"` already, not `DRAFT`. There's no payment step to wait for; this is a
  direct grant.
- `hostUserId` becomes the event's **primary host** (`displayOrder: 0`), not the admin making the
  call. The admin is never added as a member of the event.
- `planTierCode` can name a plan that **isn't on the public/self-serve menu** — an internal or
  promotional plan tier that a real customer could never buy through checkout still works here, as
  long as it's not archived and its `eventTypeKey` matches `event.eventType`. If you need such a
  plan tier to exist first, create it through the existing plan-tier admin endpoints with
  `isPublic: false`, `isAssignable: true`.
- Because the event is created `ACTIVE` immediately, everything that normally happens on
  activation happens here too — most notably, default QR links are provisioned right away. The
  event is fully usable the moment this call returns; there's no follow-up "activate" call needed.
- `404` if `hostUserId` doesn't exist. Same `400`/`409` validation errors as `POST /api/events`
  for a bad `eventType`, unsupported visibility, etc. — `hostUserId`'s own `eventCreationLocked`
  flag is **not** checked here, by design (see above).

**Do this:** an admin "provision an event" screen can reuse your existing event-creation form
almost as-is — same fields, same validation — plus one extra "host" user picker at the top. The
event it produces needs no further "activate" or "publish" step; treat the response the same way
you'd treat an event that just came back live from a real checkout.

## What did not change

- `POST /api/events` (self-service creation) is unchanged for every account that isn't
  `eventCreationLocked`.
- `PATCH /api/admin/events/{id}/plan-tier` (moving an *existing* event to a different plan) is
  unchanged and still available as a separate operation if you need to change plans after the
  fact — `POST /api/admin/events` is only for creating a brand-new event.
- Account-scope plans remain disabled; there's no way to give a promoter account its own "plan," on
  purpose.

## Checklist

- [ ] Build the "create promoter account" form around `POST /api/users/provisioned` — no password
      field, surface the 409-already-exists case, and tell the admin the promoter will receive a
      set-password email automatically.
- [ ] Add an `eventCreationLocked` toggle to the admin user-detail view, wired to the existing
      `PATCH /api/users/{id}`.
- [ ] Build "provision an event" around `POST /api/admin/events`, reusing your event-creation form
      plus a host-user picker; treat the response as already-live (`ACTIVE`), not draft.
- [ ] If admin-only promotional plan tiers don't exist yet, create them via the plan-tier admin
      endpoints with `isPublic: false` before wiring the event-provisioning form's plan picker.
- [ ] Don't assume `eventCreationLocked` blocks `POST /api/admin/events` — it only blocks the
      account's own `POST /api/events`.
