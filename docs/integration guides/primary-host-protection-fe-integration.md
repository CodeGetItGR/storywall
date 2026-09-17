# FE integration: primary host is now protected from removal, and can transfer ownership

Shipped 2026-09-17. Fixes a gap where any co-host could demote or displace the event's primary
host. Breaking for any UI that lets a co-host remove another host or reorder `displayOrder` freely;
additive for the new transfer-primary endpoint.

## The bug

`EventHost.displayOrder == 0` marks the event's primary host (set once, at event creation). Three
endpoints let any co-host tamper with that without any check:

- `DELETE /api/event-hosts/{id}` — any host could delete the primary host's row, silently
  demoting them to `ATTENDEE`. Worked even when the primary deleted their own row.
- `PATCH /api/events/{eventId}/hosts/{id}` — any host could set any host's `displayOrder` to `0`,
  self-promoting to primary, or move the real primary's `displayOrder` away from `0`.
- `POST /api/event-hosts` — any host could create a new host row with `displayOrder: 0`, producing
  a second "primary".

All three are now closed, and moving primary status is only possible through a new dedicated
endpoint.

## What changed

### `displayOrder: 0` is now reserved

- `POST /api/event-hosts` with `displayOrder: 0` now returns `409` with `errorCode: 5070`
  (`error.event_host_display_order_reserved`), for every caller, host included.
- `PATCH /api/events/{eventId}/hosts/{id}` now returns the same `409`/`5070` if the request body's
  `displayOrder` is `0`, **or** if the host being patched is currently the primary host (its
  `displayOrder` cannot be changed via `PATCH` at all — only via the new transfer endpoint below).
  Patching a non-primary host's `displayOrder` to any non-zero value still works exactly as before.

### The primary host can no longer be removed via `DELETE`

- `DELETE /api/event-hosts/{id}` now returns `409` with `errorCode: 5069`
  (`error.event_host_primary_cannot_be_removed`) whenever `id` names the event's primary host —
  including when the primary host is deleting their own row. This applies on top of the existing
  "can't remove the last host" `409` check, which still fires first when there's only one host left.
  Removing a non-primary co-host is unaffected.

### New: transfer primary status

```
POST /api/events/{eventId}/hosts/{id}/primary
```

- `id` is the `EventHost` id of the co-host who should become the new primary.
- Caller must be the event's **current primary host** — anyone else gets `403` with
  `errorCode: 4004` (`error.event_host_transfer_not_primary_host`).
- Swaps `displayOrder` between the caller's host row and the target's: the caller becomes a regular
  co-host (inherits the target's old `displayOrder`), the target becomes primary (`displayOrder: 0`).
  Every other host's `displayOrder` is untouched.
- Returns the updated `EventHostResponseDto` for the new primary (same shape as the other host
  endpoints).
- Targeting a host who's already primary, or a host id that doesn't belong to `eventId`, returns
  `409`/`404` respectively.

**Do this:** if your UI has (or was planning) an "ownership transfer" or "make primary host" action,
point it at this endpoint instead of trying to reconstruct it from `PATCH`. If your host-list UI
lets a host reorder co-hosts by dragging, make sure that reorder path never sends `displayOrder: 0`
and never targets the primary host's row — route "become primary" through this endpoint instead.

## What did not change

- Read endpoints (`GET .../hosts`, `GET /api/event-hosts/{id}`) are unaffected — `displayOrder` is
  still returned as before, so you can keep identifying the primary host as the one with
  `displayOrder === 0`.
- `POST /api/event-hosts` (adding a new host) and `PATCH` for non-primary, non-zero `displayOrder`
  values behave exactly as before.

## Checklist

- [ ] Handle `409`/`5070` on `POST /api/event-hosts` and `PATCH .../hosts/{id}` as a hard stop, not
      a retryable error.
- [ ] Handle `409`/`5069` on `DELETE /api/event-hosts/{id}` — surface it as "the primary host must
      transfer ownership before being removed," not a generic error.
- [ ] Wire any "transfer ownership" / "make primary" UI to
      `POST /api/events/{eventId}/hosts/{id}/primary`, gated so only the current primary host sees
      the action (`403`/`4004` otherwise).
- [ ] Don't build a co-host reorder UI that can send `displayOrder: 0` or retarget the primary row.
