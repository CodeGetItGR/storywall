# Delete Event — Design

**Status: backend shipped 2026-09-02, revised same day.** See
[`event-deletion-fe-integration.md`](../../integration%20guides/event-deletion-fe-integration.md)
for the authoritative contract — its revision note documents that the original "no lookup
endpoint" gap is fixed. `billing-fe-guide.md` §9 still describes the pre-revision behavior
("404s from every normal read... same as any other soft-deleted event") and has not been
updated to match; treat the deletion guide as authoritative for this discrepancy and flag the
stale line in `billing-fe-guide.md` for correction at the source. This spec is
implementation-ready.

## Context

Events are paid before they can be used, and hosts previously had no way to remove one. A
refund flow already exists ([refunds-rate-limits-fe-integration.md](../../integration%20guides/refunds-rate-limits-fe-integration.md)):
a host can request a refund on the activation payment, an admin decides, and an approved
refund returns the event to `DRAFT`/offline. That flow only ever un-publishes an event — it
never removes it. This spec covers actually deleting an event.

## 1. Backend contract (shipped)

- `POST /api/events/{eventId}/deletion-requests` — **primary host only**. "Primary host" is
  whoever has `displayOrder: 0` in `GET /api/events/{eventId}/hosts` (`useEventHosts`) — the
  host who created the event. A co-host gets `403 EVENT_DELETE_NOT_PRIMARY_HOST` (4003); the
  "Delete event" control must not be shown to anyone but the primary host in the first place.
  Body: `{ "currentPassword": string }`, verified the same way `POST /api/me/change-password`
  verifies it today (wrong password → `401 INVALID_CREDENTIALS`, reuse that handler). On
  success the response is a normal `EventResponse` with `deletedAt` and
  `deletionScheduledFor` (now + 30 days, **server-configurable — never hardcode "30 days" in
  copy, always render the actual returned date**) populated. **Deletion is orthogonal to
  `status`** — there is no new `PENDING_DELETION` status value; `status` is unchanged, and
  `deletedAt`/`deletionScheduledFor` are the only signal. The event becomes immediately
  inaccessible to guests and any non-host caller (`GET /api/events/{id}` 404s
  `RESOURCE_NOT_FOUND`/2001 for them, like any other soft-deleted event) — but **not** to its
  own hosts (primary or co-): see §3 below.
- `DELETE /api/events/{eventId}/deletion-requests` — **any host, not just the primary host**,
  no password. Cancels a pending deletion ("Undo"). A no-op (still `200`) if nothing was
  pending, so it's safe to call from a stale button without a pre-check. Response has
  `deletedAt: null, deletionScheduledFor: null`.
- Calling `POST` again while a request is already pending → `409
  EVENT_DELETE_ALREADY_PENDING` (5064) — refetch rather than retry.
- The old unauthenticated, no-confirmation `DELETE /api/events/{id}` is gone; it now 404s.
- **`GET /api/events/{id}` and `GET /api/events` stay fully readable by any host of a
  pending-deletion event**, with `deletionScheduledFor` populated on the response — this is
  what makes the pending-deletion state durable across a reload or a later session (§3), with
  no separate "my pending deletions" endpoint needed.

## 2. Refund interaction

Before showing the delete confirmation, the client calls the existing
`GET /api/events/{eventId}/refund-eligibility`.

- If `eligible: true`: the confirmation modal leads with a callout — "You may be eligible for
  a refund on this event's activation payment" — with a "Request refund instead" action that
  routes to the existing refund panel, shown alongside the destructive "Delete anyway" path.
  The host is **prompted, not blocked** — they can still delete without requesting a refund if
  they choose to.
- If not eligible, or a refund request is already pending: the callout is skipped and the
  modal goes straight to the delete confirmation.

Rationale: refund eligibility has its own time window (14 days) and no way to reclaim it later
once the event is gone. Not surfacing it at deletion time silently costs the host money they
were entitled to; blocking deletion on it would be too heavy-handed for a host who just wants
the event gone.

## 3. UI flow

Location: `SettingsTab.tsx` for the event
([app/(app)/(event)/events/[eventId]/manage/SettingsTab.tsx](<../../../app/(app)/(event)/events/[eventId]/manage/SettingsTab.tsx>)),
only rendered when the viewer is the primary host.

**Normal state:** a "Danger zone" block below the existing settings form, holding a single
"Delete event" button styled with the same rose/danger tone used elsewhere
(see [ConfirmActionModal.tsx](../../../components/ui/ConfirmActionModal.tsx)).

**Confirmation:** clicking it opens a `ConfirmActionModal`-based dialog:
- Refund callout at the top when eligible (see §2).
- A password field, reusing the `currentPassword` pattern from
  [useProfileForm.ts](../../../hooks/useProfileForm.ts) — the confirm button stays disabled
  until a password is entered.
- Errors (wrong password, 403 not-primary-host, 409 already-pending) surface inline the same
  way `handlePasswordSubmit` surfaces `changePassword` errors today.

**On success:** redirect the host to their event list, since the event's normal pages
(overview, gallery, etc. — everything except the host's own Settings/manage views) are no
longer the right place to be for a deleted event. Show a brief success toast confirming the
request went through and stating the permanent-removal date.

**Pending-deletion banner — durable, not session-bound:** `SettingsTab.tsx` already calls
`GET /api/events/{id}` on mount/reload for the event it's managing; no new call is needed. If
`deletionScheduledFor` is non-null on that response, render a banner in place of the normal
settings form instead — "This event is scheduled for permanent deletion on {date}" — with an
"Undo" button calling `DELETE .../deletion-requests` (any host, no password). This works
identically on first render, after a reload, or in a later session, because the backend keeps
serving the full detail response (with `deletionScheduledFor` set) to any of the event's hosts
— see §1. The event list a host lands on after redirect can optionally surface the same
`deletionScheduledFor` field per entry (present on `GET /api/events` per §1) so a pending
deletion is visible without opening the event, though the Settings banner is the minimum
required surface for this spec.

## 4. Out of scope / open questions

- **Co-host notification.** Whether co-hosts are notified when the primary host deletes the
  event is undecided — not covered by the shipped contract.
- **Interaction with an in-flight refund request.** What happens if a refund request is
  `PENDING` when deletion is requested is not addressed by either the deletion or refund docs.
  Not blocking (deletion and refund requests aren't mutually exclusive per the shipped API),
  but worth confirming with backend/product before launch.
- **Stale line in `billing-fe-guide.md` §9** ("a pending-deletion event 404s from every normal
  read... same as any other soft-deleted event") contradicts the revised
  `event-deletion-fe-integration.md` §4. Not a frontend blocker — the deletion guide's revision
  note makes it the authoritative source — but worth flagging back to whoever maintains the
  guides so `billing-fe-guide.md` gets corrected too.

## Decisions locked for this spec

- Primary host only can request deletion (`displayOrder: 0` in the hosts list); any host can
  undo it, no password required either to view the pending state or to undo it.
- Deletion is a soft-delete with a 30-day (server-configurable) grace period, not immediate
  hard erasure.
- The event is immediately hidden from guests/non-hosts the moment deletion is requested; hosts
  keep full read access so the pending-deletion state is durable across reloads and sessions.
- Password re-entry is required to *request* deletion (typed name/word confirmation not used);
  no password is required to *undo* it.
- Entry point and the pending-deletion banner both live in the existing event Settings tab, not
  a separate page.
