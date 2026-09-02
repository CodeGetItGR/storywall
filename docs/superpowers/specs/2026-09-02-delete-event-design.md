# Delete Event — Design

**Status: backend shipped 2026-09-02.** See
[`event-deletion-fe-integration.md`](../../integration%20guides/event-deletion-fe-integration.md)
and §5/§9 of [`billing-fe-guide.md`](../../integration%20guides/billing-fe-guide.md) for the
authoritative contract. This spec is now implementation-ready except for the one gap noted in
§4.

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
  inaccessible to everyone — including the host's own further reads — via every normal read
  endpoint (`GET /api/events/{id}` 404s it like any other soft-deleted event).
- `DELETE /api/events/{eventId}/deletion-requests` — **any host, not just the primary host**,
  no password. Cancels a pending deletion ("Undo"). A no-op (still `200`) if nothing was
  pending, so it's safe to call from a stale button without a pre-check. Response has
  `deletedAt: null, deletionScheduledFor: null`.
- Calling `POST` again while a request is already pending → `409
  EVENT_DELETE_ALREADY_PENDING` (5064) — refetch rather than retry.
- The old unauthenticated, no-confirmation `DELETE /api/events/{id}` is gone; it now 404s.

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

**On success — in-session toast, not a persistent banner:** there is no "list my pending
deletions" endpoint, and `GET /api/events/{id}` 404s the event for everyone the instant it's
deleted, including the host. So the pending-deletion state can only be shown using the
response held in memory from the `POST` call itself:
- Show a toast/snackbar in place — "Event deleted. Scheduled for permanent removal on {date}."
  — with an "Undo" button that calls `DELETE .../deletion-requests`, using the eventId/response
  already in hand. No password needed for undo, per the contract.
- Then redirect the host to their event list (or dismiss the toast on redirect, whichever is
  simpler — the toast should survive the redirect long enough to be usable, e.g. via a
  toast/notification system that persists across a route change).
- **If the host navigates away or reloads before acting on the toast, undo is no longer
  reachable from the UI** — there is nothing to fetch that would resurface it. This is a known
  limitation, not a bug: file the "list pending deletions" endpoint as a backend follow-up (see
  §4) rather than attempting to fake persistence client-side (e.g. localStorage), which would
  drift from the backend's actual truth (the purge date is server-configurable and the request
  could already be gone if, hypothetically, another host undid it from a different device).

## 4. Out of scope / open questions for backend

- **No "pending deletions" list/lookup endpoint.** Once a host leaves the in-session toast
  (§3), there is currently no way to re-surface a pending deletion's Undo control — not from
  Settings, not from the event list, nowhere. File this as a backend follow-up if a durable,
  revisitable "Undo" experience is wanted; until then, the toast is the entire undo window in
  practice.
- **Co-host notification.** Whether co-hosts are notified when the primary host deletes the
  event is undecided — not covered by the shipped contract.
- **Interaction with an in-flight refund request.** What happens if a refund request is
  `PENDING` when deletion is requested is not addressed by either the deletion or refund docs.
  Not blocking (deletion and refund requests aren't mutually exclusive per the shipped API),
  but worth confirming with backend/product before launch.

## Decisions locked for this spec

- Primary host only can request deletion (`displayOrder: 0` in the hosts list); any host can
  undo it.
- Deletion is a soft-delete with a 30-day (server-configurable) grace period, not immediate
  hard erasure.
- The event is immediately hidden from everyone the moment deletion is requested.
- Undo is only reachable via the in-session toast shown right after the delete action — there
  is no durable, revisitable pending-deletion UI today (see §4).
- Password re-entry is required to *request* deletion (typed name/word confirmation not used);
  no password is required to *undo* it.
- Entry point lives in the existing event Settings tab as a "Danger zone", not a separate page.
