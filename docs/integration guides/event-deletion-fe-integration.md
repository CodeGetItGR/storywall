# FE integration guide: deleting an event

Covers a change shipped 2026-09-02, revised the same day: hosts can now delete an event, gated
behind the primary host's password. See `frontend-integration-guide.md` §0 for base setup (auth
header, the RFC 7807 error envelope) and `billing-fe-guide.md` §5 for the rest of the event
lifecycle — this doc is the focused "what's new" record for deletion specifically.

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

### 2. `POST /api/events/{eventId}/deletion-requests` — primary host only

```http
POST /api/events/{eventId}/deletion-requests
Authorization: Bearer <jwt>
Content-Type: application/json

{ "currentPassword": "the host's current account password" }
```

**Primary-host-only — a co-host cannot delete the event, even though co-hosts can do almost
everything else a host can.** "Primary host" is the host who created the event (`displayOrder: 0`
in the `hosts` array on `GET /api/events/{id}`, §5 of `billing-fe-guide.md`) — in practice, whoever
is first in that list. A co-host attempting this gets `403 EVENT_DELETE_NOT_PRIMARY_HOST` (4003); do
not show the "Delete event" danger-zone button to anyone but the primary host in the first place,
the same way you already gate host-only UI on host membership.

**Password re-entry is required**, verified the same way `POST /api/me/change-password` verifies
`currentPassword` — a wrong password returns `401 INVALID_CREDENTIALS` (1001), the same code your
change-password error handling already branches on. Reuse that handler rather than adding a new one.

```jsonc
// 200 — EventResponse, same shape as every other event write
{
  "id": "…",
  "title": "Anna & Nik's Wedding",
  "status": "ACTIVE",
  "deletedAt": "2026-09-02T14:03:11Z",
  "deletionScheduledFor": "2026-10-02T14:03:11Z",   // new field — see §4 below
  …
}
```

Calling it a second time while a request is already pending → `409 EVENT_DELETE_ALREADY_PENDING`
(5064). Refetch the event instead of retrying — it's already in the state you wanted.

**On success, redirect the host out of the event** (e.g. to their event list) — it is immediately
inaccessible to guests and plain attendees (`GET /api/events/{id}` 404s it for them, same as any
other soft-deleted event). It is **not** inaccessible to the host who just deleted it, or to any
co-host: `GET /api/events/{id}` keeps working for them, now returning `deletionScheduledFor` instead
of the normal null — see §4. That's what makes the undo banner survive a reload rather than only
existing as an in-session toast.

### 3. `DELETE /api/events/{eventId}/deletion-requests` — any host, no password ("Undo")

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

### 4. `deletionScheduledFor` on the event, and where you can still read it from

Both `EventResponse` and `EventDetailResponse` gain:

```ts
deletionScheduledFor: string | null;   // ISO-8601, or null if not pending deletion
```

Non-null means a deletion request is pending and this is the exact permanent-purge timestamp
(currently 30 days after the request — configurable server-side, so don't hard-code "30 days" in
copy; render the actual date).

**§2 said `GET /api/events/{id}` 404s a deleted event "for everyone" — that's true for guests and
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

## Refund interaction (unchanged, frontend-only)

Nothing on the backend changed here — this is a reminder, not a new contract. Before showing the
delete confirmation, call the existing `GET /api/events/{eventId}/refund-eligibility`
(`billing-fe-guide.md` §9) and, if `eligible: true`, lead the confirmation modal with a callout
offering "Request a refund instead" alongside the destructive "Delete anyway" path — the host is
prompted, not blocked. If not eligible, or a request is already pending, skip straight to the
password-confirmation step.

## Error codes

| code | HTTP | when | what to show |
|---|---|---|---|
| `4003` `EVENT_DELETE_NOT_PRIMARY_HOST` | 403 | a co-host called `POST .../deletion-requests` | don't show the delete control to non-primary hosts at all; if reached anyway, "Only the event's original host can delete it" |
| `1001` `INVALID_CREDENTIALS` | 401 | wrong `currentPassword` | inline field error, same handling as `POST /api/me/change-password` |
| `5064` `EVENT_DELETE_ALREADY_PENDING` | 409 | a deletion request already exists for this event | refetch the event; show the pending-deletion banner instead of the confirmation modal |
| `403` (generic `FORBIDDEN`, 4001) | 403 | caller isn't a host at all, on either endpoint | shouldn't be reachable from correctly-gated UI |

## TypeScript types

```ts
export interface EventDeletionRequest {
  currentPassword: string;
}

// Additions to the existing EventResponse / EventDetailResponse:
export interface EventResponse {
  // …existing fields…
  deletedAt: string | null;
  deletionScheduledFor: string | null;  // new
}
```
