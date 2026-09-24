# Withdrawal compliance, phase 1 — FE integration

2026-09-23. Backend spec: `docs/superpowers/specs/2026-09-23-withdrawal-compliance-and-per-order-refunds-design.md` §3.
**Breaking for the frontend** (sections 1 and 2).

## 1. `galleryOpensAt` is gone (breaking)

There is no pre-event gallery gate, and there never was one on the upload path. Removed:

| Where | Field |
|---|---|
| `EventResponseDto` | `galleryOpensAt` |
| `EventDetailResponseDto.schedule` (`EventScheduleDto`) | `galleryOpensAt` |
| `ProjectedCoverageDto` (`projectedCoverage`) | `galleryOpensAt` |
| `GET /api/config` → `coverage` | `maxPreEventDays` |

Remove every "gallery opens on …" line, including the checkout disclosure
(`ActivationDisclosures.tsx`). Keep "kept until `coverageEndsAt`". Uploads are open from
activation, within the storage quota.

## 2. Only the primary host buys (breaking for co-hosts)

These now answer `403` with `errorCode: 4006` (`PURCHASE_NOT_PRIMARY_HOST`) for a co-host:

- `POST /api/events/{id}/checkout`
- `POST /api/events/{id}/upgrade-checkout`
- `GET /api/events/{id}/upgrade-options`
- `POST /api/events/{id}/storage-checkout`
- `POST /api/events/{id}/checkout/preview-code`
- `POST /api/events/{id}/addons`
- `PATCH /api/events/{id}` when it **changes** a draft's `coverageOptionId` (the duration, and so
  the price). Sending the current value back, and every other field, stays open to co-hosts.

Hide the buy, upgrade, storage and add-on actions, and the draft's duration picker, unless the
viewer is the primary host (`displayOrder: 0` in `GET /api/events/{id}/hosts`). If you still get a
4006, say "Only the event's main host can make purchases." A member who isn't a host at all now
gets 4006 too, where it used to get the generic 403. A non-member still gets the generic 403.
`GET /api/events/{id}/billing` stays readable by every host.

## 3. Primary-host transfer can be locked

`POST /api/events/{eventId}/hosts/{id}/primary` answers `409` with `errorCode: 5081`
(`HOST_TRANSFER_WITHDRAWAL_OPEN`) while any paid order on the event can still be withdrawn:

```json
{ "status": 409, "errorCode": 5081, "details": { "unlocksAt": "2026-10-06T21:00:00Z" } }
```

Show "You can hand this event over from {unlocksAt, local date and time}." The reason: only the
primary host may withdraw, and a refund goes to the card that paid.

## 4. `windowClosesAt` is later, and exact

`GET /api/events/{id}/withdrawal-preview` → `windowClosesAt` used to be `paidAt + 14×24h`. It is
now the end of the 14th day after payment in Athens time, moved to the end of Monday when that day
is a Saturday or Sunday. It is the first instant withdrawal is **no longer** possible, so render it
as "until {windowClosesAt − 1 second}", or as the Athens date of the day before it plus "end of
day". The field and its type are unchanged.

## 5. Nothing else changed shape

The add-on double count was fixed server-side. For an activation with an add-on, preview amounts
can now be lower than before, and correct. No field changed.
