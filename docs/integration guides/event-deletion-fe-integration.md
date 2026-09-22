# FE integration guide: deleting an event

Covers a change shipped 2026-09-02, revised 2026-09-21: hosts can now delete an event, gated behind
a one-time 6-digit code mailed to the primary host (previously: their account password). See
`frontend-integration-guide.md` §0 for base setup (auth header, the RFC 7807 error envelope) and
`billing-fe-guide.md` §5 for the rest of the event lifecycle — this doc is the focused "what's new"
record for deletion specifically.

**Revision note:** the first version of this doc said there was no way to look up a pending
deletion after the initial `POST`/`DELETE .../deletion-requests` response — that the undo banner
only worked from an in-session toast, and reloading or navigating away lost it. That's fixed: §4
below now describes the real, current contract (`GET /api/events/{id}` and `GET /api/events` both
surface a pending-deletion event to its hosts). There is no outstanding backend follow-up for this.

## Why

Events could be un-published (an approved refund returns one to `DRAFT`, see `billing-fe-guide.md`
§9) but never actually removed. This closes that gap with a soft-delete-and-undo flow rather than an
instant, irreversible one: a deletion request takes the event down immediately but leaves 30 days to
change your mind before anything is actually purged.

## What's new

### 1. `DELETE /api/events/{id}` no longer exists

The old any-host, no-confirmation delete is gone, replaced entirely by the two endpoints below. If
your client still calls `DELETE /api/events/{id}`, that route now 404s — remove it in favor of
`POST .../deletion-requests`.

### 2. `POST /api/events/{eventId}/deletion-requests/otp` — request a code

```http
POST /api/events/{eventId}/deletion-requests/otp
Authorization: Bearer <jwt>
```

**Primary-host-only — a co-host cannot request this, even though co-hosts can do almost everything
else a host can.** "Primary host" is the host who created the event (`displayOrder: 0` in the
`hosts` array on `GET /api/events/{id}`, §5 of `billing-fe-guide.md`) — in practice, whoever is
first in that list. A co-host attempting this gets `403 EVENT_DELETE_NOT_PRIMARY_HOST` (4003); do
not show the "Delete event" danger-zone button to anyone but the primary host in the first place.

Rate-limited to **one request per 60 seconds per caller** — debounce the "resend code" button
client-side too, but treat the server limit as the real guard.

`204 No Content` on success; no body. The 6-digit code is mailed to the primary host's own address
and expires in **10 minutes**. Calling this while a deletion is already pending →
`409 EVENT_DELETE_ALREADY_PENDING` (5064).

### 3. `POST /api/events/{eventId}/deletion-requests` — confirm with the code

```http
POST /api/events/{eventId}/deletion-requests
Authorization: Bearer <jwt>
Content-Type: application/json

{ "otpCode": "042817" }
```

**Primary-host-only**, same 403 as above. `otpCode` must be exactly 6 digits.

- No code was ever requested (or it was superseded — see below) → `400 EVENT_DELETE_OTP_NOT_REQUESTED` (3028)
- The code expired (10 minutes) → `400 EVENT_DELETE_OTP_EXPIRED` (3029)
- 5 wrong guesses already made against this code → `400 EVENT_DELETE_OTP_TOO_MANY_ATTEMPTS` (3030) — request a new one, don't keep retrying
- Wrong code (attempt 1–5) → `400 EVENT_DELETE_OTP_INVALID` (3031) — each wrong guess counts toward the 5-attempt cap above
- Deletion already pending → `409 EVENT_DELETE_ALREADY_PENDING` (5064)

Also rate-limited (added 2026-09-21): **five confirms per 60 seconds per caller** → `429` on the
sixth. A host who mistypes five times in a minute has exhausted the code anyway (3030), so this only
bites an automated guesser — no UI change needed beyond handling `429` like any other endpoint.

Requesting a **new** code (calling §2 again) immediately invalidates any previous outstanding code
for that event — if the host clicks "resend," the old code in an earlier email stops working, even
if it hadn't expired yet. Only the most recently mailed code is ever live.

```jsonc
// 200 — EventResponse, same shape as every other event write
{
  "id": "…",
  "title": "Anna & Nik's Wedding",
  "status": "ACTIVE",
  "deletedAt": "2026-09-21T14:03:11Z",
  "deletionScheduledFor": "2026-10-21T14:03:11Z",   // see §4 below
  …
}
```

**On success, redirect the host out of the event** (e.g. to their event list) — it is immediately
inaccessible to guests and plain attendees (`GET /api/events/{id}` 404s it for them, same as any
other soft-deleted event). It is **not** inaccessible to the host who just deleted it, or to any
co-host: `GET /api/events/{id}` keeps working for them, now returning `deletionScheduledFor` instead
of the normal null — see §4.

**Suggested UI flow:** danger-zone button → "Send code" (calls §2, shows "check your email") → code
input + "Confirm deletion" (calls §3). Don't collapse this into one step; the whole point is that the
host has to actually receive and read the email before the event is gone.

### 4. `DELETE /api/events/{eventId}/deletion-requests` — any host, no password ("Undo")

```http
DELETE /api/events/{eventId}/deletion-requests
Authorization: Bearer <jwt>
```

Cancels a pending deletion. **Any host can undo it, not just the primary host** — deliberately
looser than requesting it, the same asymmetry as "one click to break something, agreement from
anyone with a key to unbreak it." No password required. A no-op (still `200`) if nothing was
pending — safe to call from a stale "Undo" button without checking first.

```jsonc
// 200 — deletionScheduledFor is back to null
{ "id": "…", "deletedAt": null, "deletionScheduledFor": null, … }
```

### 5. `deletionScheduledFor` on the event, and where you can still read it from

Both `EventResponse` and `EventDetailResponse` gain:

```ts
deletionScheduledFor: string | null;   // ISO-8601, or null if not pending deletion
```

Non-null means a deletion request is pending and this is the exact permanent-purge timestamp
(currently 30 days after the request — configurable server-side, so don't hard-code "30 days" in
copy; render the actual date).

**§3 said `GET /api/events/{id}` 404s a deleted event "for everyone" — that's true for guests and
plain attendees, but not for hosts.** A pending-deletion event stays visible to any of its hosts
(primary or co-) on both:

- `GET /api/events/{id}` — returns the full detail view exactly as before, with
  `deletionScheduledFor` set. This is what `SettingsTab.tsx` should call on mount/reload to decide
  whether to render the normal settings form or the pending-deletion banner — no special-casing
  needed, the same call you already make answers both questions.
- `GET /api/events` — the pending-deletion event is included in a host's list (with
  `deletionScheduledFor` set on its entry), instead of silently disappearing. It's still excluded
  from `GET /api/events` for anyone who isn't one of its hosts, same as a guest hitting the detail
  endpoint.

So the undo affordance is **not** limited to an in-session toast: reload the page, come back next
session, get to it from the event list — `GET /api/events/{id}` on that event's own settings page
answers correctly every time. There is no separate "my pending deletions" endpoint, and none is
needed — the existing list/detail endpoints already carry this state for a host.

```jsonc
// GET /api/events/{eventId} — as a host, after the retention window has not yet passed
{
  "id": "…",
  "status": "ACTIVE",           // unchanged — deletion doesn't touch status
  "deletedAt": "2026-09-02T14:03:11Z",
  "deletionScheduledFor": "2026-10-02T14:03:11Z",
  "hosts": [ /* … */ ],
  …
}

// Same call from a guest or plain attendee, or any caller who isn't a host
// → 404 RESOURCE_NOT_FOUND (2001), identical to any other soft-deleted event
```

## Withdrawal interaction (revised 2026-09-21 — the old refund-eligibility flow is gone)

**This section previously pointed at `GET /api/events/{eventId}/refund-eligibility`. That endpoint
no longer exists** — `billing-fe-guide.md` §9 replaced the old admin-approved refund-request flow
with automated **withdrawal**, and withdrawal is **terminal**: a successful withdrawal refunds the
host and soft-deletes the event in the same call, with no "return to draft" any more. That changes
the shape of this interaction — it's not a refund nudge bolted onto the delete confirmation, it's two
separate ways to remove the event, one with money back and one without.

Before showing the delete confirmation, call `GET /api/events/{eventId}/withdrawal-preview`
(`billing-fe-guide.md` §9). Nothing is persisted by this call, so it's safe to call every time the
danger-zone screen loads.

- **`eligible: true`** — offer "Request withdrawal (get a refund)" as its own primary action,
  alongside "Delete without a refund" (the OTP flow in §2–§3 above). Withdrawal calls
  `POST /api/events/{eventId}/withdrawals` directly — it does **not** go through the OTP flow at all.
  - A `REFUNDED` outcome means the event is already gone; don't also run the OTP-deletion flow.
  - A `HELD` outcome (fraud review) leaves the event completely untouched — tell the host their
    withdrawal is pending admin review, and let them still choose the OTP-deletion path below if
    they don't want to wait for it.
- **`eligible: false`** (`refusals` non-empty) or the host declines the refund — go straight to the
  OTP flow (§2–§3); no refund is issued.

## Error codes

| code | HTTP | when | what to show |
|---|---|---|---|
| `4003` `EVENT_DELETE_NOT_PRIMARY_HOST` | 403 | a co-host called either endpoint | don't show the delete control to non-primary hosts at all; if reached anyway, "Only the event's original host can delete it" |
| `5064` `EVENT_DELETE_ALREADY_PENDING` | 409 | a deletion request already exists for this event | refetch the event; show the pending-deletion banner instead of the confirmation modal |
| `3028` `EVENT_DELETE_OTP_NOT_REQUESTED` | 400 | confirming with no live code (never requested, or superseded by a resend) | send the host back to the "send code" step |
| `3029` `EVENT_DELETE_OTP_EXPIRED` | 400 | the 10-minute window passed | prompt to request a new code |
| `3030` `EVENT_DELETE_OTP_TOO_MANY_ATTEMPTS` | 400 | 5 wrong guesses already made | prompt to request a new code; don't let the user keep retyping |
| `3031` `EVENT_DELETE_OTP_INVALID` | 400 | wrong code, attempt 1–5, or a code superseded by a resend | inline field error, "Incorrect code" — show remaining-attempts messaging if you want, the response doesn't include a count |
| `403` (generic `FORBIDDEN`, 4001) | 403 | caller isn't a host at all, on any endpoint | shouldn't be reachable from correctly-gated UI |

## TypeScript types

```ts
// No body for POST .../deletion-requests/otp — 204 No Content.

export interface EventDeletionRequest {
  otpCode: string;   // exactly 6 digits
}

// Additions to the existing EventResponse / EventDetailResponse:
export interface EventResponse {
  // …existing fields…
  deletedAt: string | null;
  deletionScheduledFor: string | null;  // new
}
```
