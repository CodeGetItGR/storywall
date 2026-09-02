# Delete Event — Design

## Context

Events are paid before they can be used, and hosts currently have no way to remove one. A
refund flow already exists ([refunds-rate-limits-fe-integration.md](../../integration%20guides/refunds-rate-limits-fe-integration.md)):
a host can request a refund on the activation payment, an admin decides, and an approved
refund returns the event to `DRAFT`/offline. That flow only ever un-publishes an event — it
never removes it. This spec covers actually deleting an event.

**Backend gap:** there is no `DELETE /api/events/{eventId}` (or archive) endpoint documented
anywhere in `docs/integration guides/`. The only `DELETE` endpoints on an event today are for
`subscription` and `gift-account`. Section 1 below is therefore a **requirement for the
backend team**, not a description of an existing API — the frontend work in section 3 is
blocked on it shipping.

## 1. Backend contract (new — required, not yet built)

- `POST /api/events/{eventId}/deletion-requests` — host only, **primary host only** (the
  account tied to the original activation payment; co-hosts get `403`
  `EVENT_DELETE_NOT_PRIMARY_HOST`). Body: `{ "currentPassword": string }`, verified the same
  way `POST /api/me/change-password` verifies it today. On success, the event moves to a
  `PENDING_DELETION` state with a `deletionScheduledFor` timestamp set to **now + 30 days**
  (grace period length to be confirmed with backend/product — see §4). The event becomes
  immediately inaccessible to guests and co-hosts (404/410-style "no longer available"), but
  no data (media, posts, RSVPs, orders) is erased yet.
- `DELETE /api/events/{eventId}/deletion-requests` — host only. Cancels a pending deletion
  ("Undo") and restores the event to whatever status it held before deletion was requested.
  No password required.
- `GET /api/events/{eventId}` (existing) gains `deletionScheduledFor: string | null` so the
  client can render the pending-deletion state without a separate call.
- A scheduled backend job hard-deletes any event whose `deletionScheduledFor` has passed.
- New error codes:
  - `EVENT_DELETE_NOT_PRIMARY_HOST` (403) — a co-host attempted deletion.
  - `EVENT_DELETE_INVALID_PASSWORD` (401) — reuse `INVALID_CREDENTIALS` if that's simpler for
    the client to branch on the same way `useProfileForm` already does.
  - `EVENT_DELETE_ALREADY_PENDING` (409) — deletion already requested for this event.

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

**On success:** the event moves to `PENDING_DELETION`; the host is redirected out of it (e.g.
to their event list), since it is no longer accessible.

**Pending-deletion state:** if the host can still reach the event record (e.g. from an account
/ event list), Settings shows a banner instead of the normal form — "This event is scheduled
for permanent deletion on {date}" with an "Undo" button. No password required to undo.

## 4. Out of scope / open questions for backend

- **Exact grace period length.** This spec defaults to 30 days; needs confirmation from
  backend/product before implementation.
- **Co-host notification.** Whether co-hosts are notified when the primary host deletes the
  event is undecided.
- **Interaction with an in-flight refund request.** What happens if a refund request is
  `PENDING` when deletion is requested — block deletion until the refund is decided, or let
  deletion proceed and auto-resolve the refund request? Not covered by the existing refund
  doc; needs a backend/product answer before implementation.

## Decisions locked for this spec

- Primary host only can delete (not any co-host).
- Deletion is a soft-delete with a grace period, not immediate hard erasure.
- During the grace period the event is immediately hidden from everyone; only the host can
  undo, via Settings.
- Password re-entry is required to confirm deletion (typed name/word confirmation not used).
- Entry point lives in the existing event Settings tab as a "Danger zone", not a separate page.
