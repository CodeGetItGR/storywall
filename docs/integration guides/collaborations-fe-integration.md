# FE integration guide: B2B collaborations and checkout codes

Covers a change shipped 2026-08-31: a host can type a partner's code at activation checkout, and
platform admins get a surface for running those partnerships. See
`frontend-integration-guide.md` §0 for base setup (auth header, the RFC 7807 error envelope) and
`billing-fe-guide.md` for the checkout flow this plugs into.

Nothing here is breaking. A client that sends no code keeps working exactly as before.

## Why

Wedding venues and event organisers send us hosts. A code at checkout is how we both give that
host a better price and pay the partner for the referral, without inventing accounts, logins or
recurring billing for a party who only ever reads a handful of numbers.

## The three surfaces

| Audience | Route prefix | Auth |
|---|---|---|
| Host | `/api/events/{eventId}/checkout…` | JWT, must be a host of that event |
| Platform admin | `/api/admin/collaborators…` | JWT with `ROLE_ADMIN` |
| Partner | `/api/partners/{token}` | The token in the URL, nothing else |

---

## 1. Host: preview a code

```jsonc
POST /api/events/{eventId}/checkout/preview-code
{ "collaborationCode": "barn-2026" }

→ 200
{
  "label": "Barn Venue partner rate",
  "discountPercent": 10,
  "combinedDiscountPercent": 10,
  "payableAmountMinor": 8100,
  "currency": "EUR"
}
```

Rate-limited to **10 per hour per caller**. Input is trimmed and uppercased server-side, so the
host can type it however it was printed.

Previewing binds nothing. A host may preview as many times as the limit allows and walk away; the
code's redemption count is untouched until they actually start a checkout.

### `combinedDiscountPercent` is the number to show

`discountPercent` is the code's headline figure. `combinedDiscountPercent` is what will actually
come off, after any plan promotion is added in and the total clamped at the platform ceiling
(30% by default). During a promotion the combined figure can be **lower** than the sum of the two,
and it is never lower than the plan promotion alone.

Render `combinedDiscountPercent` and `payableAmountMinor`. Do not add the two percentages yourself
— the ceiling is a server-side setting and the arithmetic is deliberately in one place.

`payableAmountMinor` covers the **plan line only**. Add-ons and storage packs are never discounted
by a partner code.

### Failures say nothing

```jsonc
→ 409
{ "status": 409, "errorCode": 5060, "errorKey": "COLLABORATION_CODE_NOT_VALID",
  "detail": "That code isn't valid for this event." }
```

`5060` is returned identically for every reason a code can fail: it does not exist, it is disabled,
its partner is suspended, its window has not opened, its window has closed, or it has hit its
redemption cap. This is deliberate — a message that distinguished them would let anyone with an
account discover which code strings are real and which deals are live.

**Do not try to explain further.** Showing "this code has expired" when the backend said only "not
valid" invents information and reintroduces exactly the leak the backend closed. Render the
`detail` string as-is.

A blank or over-long (>40 char) code fails validation with a `400` before reaching any of that.

## 2. Host: apply a code at checkout

`POST /api/events/{eventId}/checkout` now accepts an optional body:

```jsonc
POST /api/events/{eventId}/checkout
{ "collaborationCode": "barn-2026" }
```

A bodyless `POST` remains valid and means "activate at list price" — no client change is required.

The same `5060` applies here, on the same terms.

### The code binds to the event, not to the order

Once an activation checkout carries a code, that partner is attached to the **event**. Consequences
the UI has to reflect:

- **Upgrades inherit it.** `POST /api/events/{eventId}/upgrade-checkout` applies the same discount
  automatically and accrues the partner further commission. Do not ask for the code again — there
  is no field for it on that request.
- **Storage packs do not.** Add-on pricing is unaffected.
- **It cannot be changed or removed from the host side.** There is no host-facing "remove code"
  endpoint, by design. Attaching a *different* code to an event that already has a live one fails:

  ```jsonc
  → 409
  { "errorCode": 5061, "errorKey": "COLLABORATION_ALREADY_REDEEMED" }
  ```

  Re-sending the *same* code is a no-op and succeeds. If a host applied the wrong code, that is a
  support request — an admin voids the attribution.
- **A refund does not detach it.** An event that is refunded and later re-activated still belongs
  to the same partner.

### Reissued checkouts

If a host applies a code, abandons the payment page, and starts again, the earlier order is closed
and a new one is opened at the new price. The client should always read `payableAmountMinor` /
the order amount from the checkout response rather than caching what the preview said.

---

## 3. Admin: running a partnership

All under `/api/admin`, all `ROLE_ADMIN`.

| Method | Path | Notes |
|---|---|---|
| `GET`/`POST` | `/collaborators` | |
| `GET`/`PATCH` | `/collaborators/{id}` | `PATCH` is a full replace; `status` may be `ACTIVE` or `SUSPENDED` |
| `POST` | `/collaborators/{id}/portal-token` | Issues a partner page link |
| `GET`/`POST` | `/collaborators/{id}/codes` | |
| `PATCH` | `/collaboration-codes/{id}` | |
| `GET` | `/collaborators/{id}/earnings` | The ledger, signed rows |
| `GET` | `/collaborators/{id}/earnings/totals` | Per-currency owed and paid |
| `POST` | `/collaboration-earnings/mark-paid` | Records a payout reference |
| `POST` | `/events/{eventId}/collaboration-redemption/void` | Detaches a partner from an event |

### Creating a code

```jsonc
POST /api/admin/collaborators/{id}/codes
{
  "code": "barn-2026",          // A–Z, 0–9 and dashes only; stored uppercase
  "label": "Barn Venue partner rate",   // What the host sees at checkout
  "discountPercent": 10,        // 0–99. 100 is rejected: a zero-amount charge cannot be collected
  "commissionPercent": 15,      // 0–100. 0 is a perk-only partnership
  "startsAt": null,             // null means open-ended, both ends
  "endsAt": null,
  "maxRedemptions": null        // null means unlimited
}
```

The two percentages are independent levers, not two views of one deal. A duplicate code string is a
`409`; a window that ends before it starts is a `400`.

### The portal token is readable exactly once

```jsonc
POST /api/admin/collaborators/{id}/portal-token
→ 200 { "token": "…", "portalUrl": "https://app…/partners/…" }
```

Only the hash is stored. `GET /collaborators/{id}` afterwards reports `portalTokenIssued: true` and
`portalTokenIssuedAt`, and **never** the token. Rotating issues a new one and dead-links the
previous URL immediately. There is no recovery — an admin who loses it rotates again.

The admin UI must show this value on the response screen and warn that it will not be shown again.
Do not persist it client-side.

### Code strings are not editable

`PATCH /collaboration-codes/{id}` has no `code` field. A partner has already printed the string on
their brochures; retiring one means setting `status: "DISABLED"` and issuing a new code.

Editing the rates affects **future** redemptions only. Every existing redemption snapshotted its
percentages when it was made, so nothing already discounted or already earned moves.

### Voiding an attribution

```jsonc
POST /api/admin/events/{eventId}/collaboration-redemption/void
{ "reason": "code leaked publicly" }
```

A reason is mandatory (`400` if blank). This is the remedy for a code applied wrongly — leaked,
self-dealt, or attached to the wrong partner.

It unwinds the **commission only**. The host's order is untouched and they keep the price they were
charged: we cannot bill a customer more because their venue turned out to be self-dealing. Accrued
rows become `REVERSED`; rows already paid out get a negative `CLAWBACK` row appended rather than
being edited.

### The ledger

Amounts are **signed minor units**. An `ACCRUAL` is positive, a `CLAWBACK` negative, so a payout is
a plain sum. Totals are per currency and must never be added across currencies.

`POST /collaboration-earnings/mark-paid` records that a bank transfer happened; it moves no money.
A row that is not `ACCRUED` is refused with `errorCode 5062 COLLABORATION_EARNING_NOT_PAYABLE`, so
double-paying is not possible.

---

## 4. Partner: the page

```jsonc
GET /api/partners/{token}          // No Authorization header

→ 200
{
  "name": "Barn Venue",
  "eventsReferred": 12,
  "totals": [ { "currency": "EUR", "accruedMinor": 21600, "paidMinor": 18000 } ]
}
```

Unauthenticated, `GET` only, rate-limited to 30/minute. `eventsReferred` counts events that
actually went live — an abandoned checkout is not a referral.

The response deliberately contains no host names, no host emails, no event titles, no event ids and
no code strings. Anyone holding the link sees this page, and links get forwarded.

Every failure is the same `404`: unknown token, rotated token, suspended partner, deleted partner.
A stale link cannot confirm it was ever real.

## New error codes

| Code | Key | Meaning |
|---|---|---|
| `5060` | `COLLABORATION_CODE_NOT_VALID` | The code cannot be used here. No further detail, by design. |
| `5061` | `COLLABORATION_ALREADY_REDEEMED` | This event already has a different partner code. |
| `5062` | `COLLABORATION_EARNING_NOT_PAYABLE` | That ledger row is not in `ACCRUED` state. |
