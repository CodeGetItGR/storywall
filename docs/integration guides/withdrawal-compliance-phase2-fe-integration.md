# Withdrawal compliance, phase 2 — FE integration

2026-09-23. Backend spec: `docs/superpowers/specs/2026-09-23-withdrawal-compliance-and-per-order-refunds-design.md` §4.
**Breaking for the frontend** (sections 1–3). Everything after that is additive.

## 1. A storage pack checkout needs consent (breaking)

A storage pack can now be withdrawn (section 4). `POST /api/events/{id}/storage-checkout`
therefore takes the same three consent fields as activation and upgrade, with the same rules:

```json
{
  "paidServiceCode": "STORAGE_5GB",
  "requestsImmediateStart": true,
  "acknowledgesWithdrawalTerms": true,
  "termsVersion": "2026-09-17"
}
```

- Both booleans must be `true`. If either is missing or `false`, you get `400` `3001`
  (`VALIDATION_FAILED`).
- `termsVersion` comes from `GET /api/config` → `withdrawal.termsVersion`. A stale value is `400`
  `5072` (`WITHDRAWAL_TERMS_VERSION_STALE`).
- Show the same two checkboxes and the same terms link as the activation checkout.
- Remove any "storage packs are final / non-refundable" copy.

## 2. Withhold is gone (breaking for the admin screen)

- `POST /api/admin/withdrawals/{requestId}/withhold` is removed, and so is `WithdrawalWithholdDto`.
  Remove the Withhold button.
- A withdrawal decision never suspends an account any more.
- `WITHHELD` stays in `RefundRequestStatus`, and `WITHDRAWAL_WITHHELD` in the notification types,
  for rows written before today. Nothing new produces either one.

The admin's decision is now **release**, with or without keeping the event day:

```http
POST /api/admin/withdrawals/{requestId}/release
{ "keepEventDay": true, "note": "The party took place on 3 October; the gallery has 64 photos from that night." }
```

- **No body** refunds exactly as computed, as before. An existing call with no body keeps working.
- **With a body**, `keepEventDay` is required: without it the call is `400` `3001`. `note` is at
  most 1000 characters.
- **`keepEventDay: true`** keeps the event-day share, and any add-on, on the activation and upgrade
  lines. Setup and hosting are unchanged, and storage-pack lines are untouched. An upgrade bought
  after the paid-for date is untouched too: it had no part in that day. Use it when the event took
  place on the date that was paid for, but the host moved `startAt` afterwards and then withdrew.
  - It needs a `note` (`400` `3001` without one).
  - It is refused unless the date that was paid for had passed **when the host withdrew**: `409`
    `5083` (`WITHDRAWAL_KEEP_EVENT_DAY_NOT_DUE`). A date that passes during the hold doesn't count:
    the host owes only for what was supplied before they withdrew. That date is
    `usageFacts.activatedStartAt` on the admin sheet; offer the option only when it is before the
    request's `createdAt`.
  - Never offer it on a storage-pack request: it changes nothing there. Such a request is held only
    in manual mode, and its `usageFacts` is `null` and its `fraudSignals` empty, because a pack is
    never screened.
- **`note` is shown to the host** in their withdrawal history (`decisionNote`). Write it for them.
- A second release is `409` `5074` (`WITHDRAWAL_NOT_HELD`). Until today that 409 carried the generic
  `5001` code.
- The admin sheet's `recommendation` text no longer mentions withholding. It ends with the release
  choice.

## 3. New enum values (breaking if you switch exhaustively)

| Type | New values |
|---|---|
| `RefundBasis` | `PRO_RATA_BY_TIME`: a consented storage-pack line, kept pro rata by time and nothing else. A pack bought before today has no consent on record and is `NO_CONSENT_FULL_REFUND`: refunded in full |
| refusal `code` | `ORDER_NOT_PAID`, `ORDER_ALREADY_WITHDRAWN` (section 4) |
| `NotificationType` | `STORAGE_TRIM_SCHEDULED`, `STORAGE_TRIM_WARNING` (section 7) |

Refusal `message`s are still written to be shown verbatim.

## 4. Withdraw one upgrade or one storage pack (new)

```http
GET  /api/events/{eventId}/orders/{orderId}/withdrawal-preview
POST /api/events/{eventId}/orders/{orderId}/withdrawals        body optional: { "reason": "…" }
```

**Who and which order.**
- Only the primary host can call these (`403` `4005` otherwise), as with the event endpoints.
- `orderId` is a `PAID` `UPGRADE` or `STORAGE_PACK` order from `GET /api/events/{id}/billing` →
  `orders`.
- An `ACTIVATION` is `400` `5082` (`WITHDRAWAL_ORDER_KIND_NOT_SUPPORTED`): withdrawing it *is*
  withdrawing the event, so use `/withdrawals` on the event.
- An unknown order, or another event's order, is `404` `2001`.

**What goes:**
- **A storage pack** goes on its own. It is refunded at once and never reviewed, unless the platform
  is in manual mode. The refund is pro rata by time: what it cost, less the share of the time from
  its payment to `coverageEndsAt` that has passed. (A pack bought before today is refunded in full:
  its checkout asked for no consent.) Its bytes come off the limit, and the pack can be
  bought again.
- **An upgrade** takes every upgrade bought after it, newest first. The event goes back to the plan
  and duration underneath, and `coverageEndsAt` moves back by the months they added. It is screened
  like an event withdrawal, so it may be held for review.
- **The event stays.** It is never deleted by these endpoints.

**The window.** Each order has its own window: 14 days from *its* payment, same rule as phase 1.
The preview's top-level `windowClosesAt` belongs to the order named, and each line carries its own.

**Answers.** They are those of the event endpoint:
- `201` with the request when it is `REFUNDED` or `HELD`.
- `409` `5073` when it is refused.

The refusal codes are:
- `ORDER_ALREADY_WITHDRAWN`, `ORDER_NOT_PAID`, `WINDOW_CLOSED`;
- `ALREADY_IN_PROGRESS`, when the whole event is under review, or when an order this request
  includes is already on a request under review. A pack under review doesn't block another pack.
- `NO_SETTLED_ACTIVATION` / `ALREADY_REFUNDED`, when the event itself is gone.

The rate limit (5/hour) is shared with the event endpoint.

**Where to offer it.** Put "Withdraw" on each `PAID` upgrade and pack in the billing view. Take the
eligibility and the amount from the preview, never from your own arithmetic.

## 5. The preview says more

`GET …/withdrawal-preview`, both scopes, gains:

| Field | Meaning |
|---|---|
| `scope` | `"EVENT"` or `"ORDER"` |
| `orderId` | the order the request would name: the activation, or the order in the path |
| `instant` | `true` only for a storage pack in automatic mode: say "refunded straight away". `false` promises nothing either way, so say nothing about timing (the same rule as `scheduleMovedAfterPayment: false`) |
| `storageAfter` | ORDER only (else `null`): `{ newLimitBytes, usageBytes, overLimitBytes, trimDueAt }` |
| `lines[].windowClosesAt` | that order's own window |
| `lines[].keepEventDay` | always `false` on a preview |

On an ORDER preview:
- `windowClosesAt` and `currency` are the named order's, so they are never `null`.
- `scheduleMovedAfterPayment` can be `true` only for an upgrade, which is screened. A storage pack's
  is always `false`: it is refunded whatever the date.

**`storageAfter`.**
- Show "Your storage limit goes from X to `newLimitBytes`; you hold `usageBytes`." A `null`
  `newLimitBytes` means unlimited.
- When `overLimitBytes > 0`, add: "`overLimitBytes` will be over the limit. Unless you free space by
  `trimDueAt`, the newest photos and videos above it will be deleted. Download the gallery first."

An **EVENT** preview now lists the event's storage packs too, one line each (`PRO_RATA_BY_TIME`, or
`NO_CONSENT_FULL_REFUND` for a pack bought before today). They end with the event (Art. 15).

## 6. The withdrawal history

- `GET /api/events/{id}/withdrawals` rows gain `scope` and `orderId` (`null` on an EVENT request
  refused for having no paid activation). Their lines gain `windowClosesAt` and `keepEventDay`.
- `decisionNote` now appears on released requests. It holds the reviewer's note, or, on an
  auto-release of an event moved after payment, what the evidence rule found. Render it as plain
  text.
- When a line has `keepEventDay: true`, say "The event-day share was kept: the event took place on
  the date you paid for."
- A released line whose order had already been refunded some other way (a chargeback) shows
  `refundMinor: 0` and `providerRefunded: false`, and `totalRefundMinor` counts only what this
  withdrawal paid back. Don't present that line as money still to come.

## 7. Storage over the limit after a withdrawal

Withdrawing a pack or an upgrade, or a lost chargeback on one, can leave the event holding more
than its new limit.

- **`GET /api/events/{id}/billing`** gains `storageTrimDueAt`. It is `null` unless a removal is
  scheduled. Show the date prominently while it is set.
- **Two `BILLING` notifications** go to the primary host, both with `ctaTarget: "EVENT_GALLERY"`:
  - `STORAGE_TRIM_SCHEDULED` (`WARNING`) goes out at once.
  - `STORAGE_TRIM_WARNING` (`CRITICAL`) goes out once, about 2 days before the date.
  - The payload is `{ eventTitle, usedFormatted, limitFormatted, overFormatted, dueDate, usageBytes,
    limitBytes, trimDueAt }`, where `dueDate` is Athens time, `yyyy-MM-dd HH:mm`.
- **Uploads** fail with `5008` while the event is over its limit, as they always did.
- **On the date**, the newest media above the limit are deleted until usage fits.
- **Buying a pack or an upgrade** that makes usage fit clears the date at once: `storageTrimDueAt`
  goes back to `null`.
- **Deleting files** until usage fits cancels the removal too, but the date is cleared at the next
  hourly check, not the instant the files go. Nothing is deleted while usage fits: the removal
  checks again before it runs.

## 8. Notifications for one order

`WITHDRAWAL_REFUNDED` also fires for an ORDER request, with severity `INFO`, because the event
stays. Its payload gains `scope` and `orderId`. When `payload.scope === "ORDER"`, don't use the
"event deleted" treatment. `WITHDRAWAL_HELD` gains the same two fields.

## 9. Buying while a withdrawal is under review (new)

A held request's lines were fixed when it was filed, so a purchase it would miss is refused until
the request is decided: `409` `5084` (`PURCHASE_WITHDRAWAL_OPEN`).

- While a request to withdraw the **whole event** is `HELD`: no storage pack and no upgrade. Its
  release deletes the event, and anything bought in between would be left paid for on it.
- While a request to withdraw an **upgrade** is `HELD`: no upgrade. A new one would be priced on the
  tier under review and would outlive it. Storage packs can still be bought.
- A `HELD` storage-pack request (manual mode only) blocks nothing.

Hide or disable those buttons while `GET /api/events/{id}/withdrawals` has a `HELD` row with
`scope: "EVENT"`, or with `scope: "ORDER"` whose `orderId` is an `UPGRADE` in the billing `orders`.
The 409 is the backstop; its `message` can be shown as is.

## 10. Error codes

| code | HTTP | when |
|---|---|---|
| `5082` `WITHDRAWAL_ORDER_KIND_NOT_SUPPORTED` | 400 | an ORDER withdrawal named the activation |
| `5083` `WITHDRAWAL_KEEP_EVENT_DAY_NOT_DUE` | 409 | release with `keepEventDay: true` when the date that was paid for hadn't passed when the host withdrew |
| `5084` `PURCHASE_WITHDRAWAL_OPEN` | 409 | a storage pack or upgrade checkout while a withdrawal it would miss is under review (section 9) |
| `5074` `WITHDRAWAL_NOT_HELD` | 409 | now actually carries this code (it was `5001`) |
