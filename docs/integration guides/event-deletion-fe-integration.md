# FE integration guide: deleting an event

Covers a change shipped 2026-09-02: hosts can now delete an event, gated behind the primary host's
password. See `frontend-integration-guide.md` §0 for base setup (auth header, the RFC 7807 error
envelope) and `billing-fe-guide.md` §5 for the rest of the event lifecycle — this doc is the focused
"what's new" record for deletion specifically.

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
inaccessible to everyone, including the host's own further reads through the normal event endpoints
(`GET /api/events/{id}` now 404s it, same as any other soft-deleted event). Only the entry point
described in §4 below can still reach it, to offer the undo.

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

### 4. `deletionScheduledFor` on the event

Both `EventResponse` and `EventDetailResponse` (`GET /api/events/{id}`) gain:

```ts
deletionScheduledFor: string | null;   // ISO-8601, or null if not pending deletion
```

Non-null means a deletion request is pending and this is the exact permanent-purge timestamp
(currently 30 days after the request — configurable server-side, so don't hard-code "30 days" in
copy; render the actual date). Because `GET /api/events/{id}` itself 404s a deleted event for
everyone (§2), the only place you'll actually observe a non-null `deletionScheduledFor` is the
response body returned directly from the `POST`/`DELETE` deletion-requests calls above — there is
currently no "my pending deletions" list endpoint. If your product needs a host to come back later
(e.g. next session) and still see the pending-deletion banner from `SettingsTab.tsx`, that list
endpoint doesn't exist yet — flag it as a follow-up rather than assuming `GET /api/events/{id}` will
answer it, since today it won't.

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
