# FE integration guide: B2B collaborations and checkout codes

Covers a change shipped 2026-08-31: a host can type a partner's code at activation checkout, and
platform admins get a surface for running those partnerships. Also covers a same-day follow-up:
**house discount codes**, the platform's own codes with no partner attached, which reuse every
endpoint on this page. See `frontend-integration-guide.md` §0 for base setup (auth header, the
RFC 7807 error envelope) and `billing-fe-guide.md` for the checkout flow this plugs into.

Nothing here is breaking. A client that sends no code keeps working exactly as before.

## Why

Wedding venues and event organisers send us hosts. A code at checkout is how we both give that
host a better price and pay the partner for the referral, without inventing accounts, logins or
recurring billing for a party who only ever reads a handful of numbers. A house code reuses the
same mechanism for a discount the platform runs itself — a promo code, a support goodwill
discount — with no partner or commission involved.

### House codes vs. partner codes — what's the same, what's not

At checkout and preview, a house code and a partner code are **indistinguishable to the caller**:
same request body, same response shape, same `5060` refusal on failure. A code starts as a house
code and can be promoted to a partner code later by linking it (§3 "Linking an already-issued house
code"), but never the other way — once linked, always a partner code. The only place the
distinction is visible to the frontend is the admin surface: a house code is managed under
`/api/admin/discount-codes` (§3b below), a partner code under `/api/admin/collaborators…` (§3).
Voiding a redemption must go through the matching one of those two — sending a partner-code void
request for an event carrying a house code (or vice versa) is refused with `5060`.

## The three surfaces

| Audience | Route prefix | Auth |
|---|---|---|
| Host | `/api/events/{eventId}/checkout…` | JWT, must be a host of that event |
| Platform admin — partner codes | `/api/admin/collaborators…` | JWT with `ROLE_ADMIN` |
| Platform admin — house codes | `/api/admin/discount-codes…` | JWT with `ROLE_ADMIN` |
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

`5060` is returned identically for every reason a code can fail, for a house code exactly as much
as a partner one: it does not exist, it is disabled, its partner is suspended (n/a for a house
code), its window has not opened, its window has closed, or it has hit its redemption cap. This is
deliberate — a message that distinguished them would let anyone with an account discover which
code strings are real and which deals are live.

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

  Re-sending the *same* code is a no-op and succeeds. This applies across code types too — a house
  code and a partner code can never both be live on the same event. If a host applied the wrong
  code, that is a support request — an admin voids it through whichever admin surface (§3 or §3b)
  matches the code's type.
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
| `GET`/`PATCH` | `/collaborators/{id}` | `PATCH` is a full replace |
| `POST` | `/collaborators/{id}/portal-token` | Issues a partner page link |
| `GET`/`POST` | `/collaborators/{id}/codes` | |
| `POST` | `/collaborators/{id}/codes/link` | Attaches an existing house code instead of issuing a new one |
| `PATCH` | `/collaboration-codes/{id}` | |
| `GET` | `/collaborators/{id}/earnings` | The ledger, signed rows |
| `GET` | `/collaborators/{id}/earnings/totals` | Per-currency owed and paid |
| `POST` | `/collaboration-earnings/mark-paid` | Records a payout reference |
| `POST` | `/events/{eventId}/collaboration-redemption/void` | Detaches a partner from an event |

### Create / read a collaborator

```jsonc
POST /api/admin/collaborators
{
  "name": "Barn Venue",
  "contactEmail": "hello@barn.test",     // lowercased and trimmed server-side
  "notes": null,                          // optional, max 2000 chars, admin-only — never shown to the partner
  "status": null                          // optional; null on create means ACTIVE
}

→ 200
{
  "id": "3fa4…",
  "name": "Barn Venue",
  "contactEmail": "hello@barn.test",
  "status": "ACTIVE",
  "portalTokenIssued": false,
  "portalTokenIssuedAt": null,
  "notes": null
}
```

`GET /api/admin/collaborators` returns a bare JSON array of the same shape (no pagination
envelope). `GET /api/admin/collaborators/{id}` returns one. The response never contains a portal
token — see below.

### Updating a collaborator, or suspending one

`PATCH /api/admin/collaborators/{id}` takes the **same body as create** — it is a full replace, not
a partial patch, despite the HTTP verb. Send `name` and `contactEmail` even if unchanged. `status`
is the field that matters here: set it to `"SUSPENDED"` to take a partner offline (their portal
page and any live codes stop working) or back to `"ACTIVE"` to restore them; leave it `null` on an
update that isn't about status to leave the current value alone.

```jsonc
PATCH /api/admin/collaborators/{id}
{ "name": "Barn Venue", "contactEmail": "hello@barn.test", "notes": "Renewed 2026", "status": "SUSPENDED" }

→ 200  // same CollaboratorResponseDto shape as above, status now "SUSPENDED"
```

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

→ 200
{
  "id": "9c1e…",
  "collaboratorId": "3fa4…",
  "code": "BARN-2026",
  "label": "Barn Venue partner rate",
  "discountPercent": 10,
  "commissionPercent": 15,
  "status": "ACTIVE",
  "startsAt": null,
  "endsAt": null,
  "maxRedemptions": null,
  "liveRedemptions": 0
}
```

`GET /api/admin/collaborators/{id}/codes` returns a bare array of the same shape, one entry per
code belonging to that collaborator. `liveRedemptions` counts `PENDING + ACTIVE` redemptions
against that code right now — this is what a cap (`maxRedemptions`) is checked against, so it is
the number to show next to it in the UI, not a lifetime total.

The two percentages are independent levers, not two views of one deal. A duplicate code string is a
`409`; a window that ends before it starts is a `400`.

### Linking an already-issued house code to a partner

The other way to get a partner code: issue a house code first via `POST /api/admin/discount-codes`
(§3b) with no partner in mind, then pair it with a collaborator later.

```jsonc
POST /api/admin/collaborators/{id}/codes/link
{
  "discountCodeId": "1a2b…",    // the id of an existing house code
  "commissionPercent": 15
}

→ 200   // same CollaborationCodeResponseDto shape as "Creating a code" above
```

**No UUID typing required in the UI.** `GET /api/admin/discount-codes` (§3b) already returns every
unlinked house code with its `code` and `label` — build the picker from that list and send the
`id` of whichever one the admin selects.

Linking is **one-directional** and **permanent**: there is no unlink endpoint, and once linked the
code drops out of `/api/admin/discount-codes` and is only reachable at the collaborator endpoints
from then on. It is also refused with a `409` if the code has ever been redeemed even once, house
or not — a redemption made before the link has no partner to attribute commission to, so linking a
code with any history would leave the ledger quietly missing that one. A brand-new house code
sidesteps this; there is no way to retroactively attribute an old redemption.

### Editing or disabling a code — no `code` field

`PATCH /api/admin/collaboration-codes/{id}` takes every field a code has **except the code string
itself**:

```jsonc
PATCH /api/admin/collaboration-codes/{id}
{
  "label": "Barn Venue — retired",
  "discountPercent": 10,
  "commissionPercent": 15,
  "status": "DISABLED",         // ACTIVE | DISABLED — required, no default
  "startsAt": null,
  "endsAt": null,
  "maxRedemptions": null
}

→ 200   // same CollaborationCodeResponseDto shape as create, liveRedemptions reflects current state
```

A partner has already printed the string on their brochures; retiring one means setting
`status: "DISABLED"` and issuing a new code, not renaming this one. All other fields are a full
replace, same as the collaborator `PATCH` — send the current values back for anything you don't
mean to change.

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

```jsonc
GET /api/admin/collaborators/{id}/earnings

→ 200
[
  {
    "id": "6b2a…",
    "eventId": "…",
    "orderId": "…",
    "codeId": "9c1e…",
    "entryType": "ACCRUAL",        // ACCRUAL | CLAWBACK
    "amountMinor": 1800,           // signed: an ACCRUAL is positive, a CLAWBACK negative
    "currency": "EUR",
    "commissionPercent": 15,       // snapshotted from the redemption, not the code's current rate
    "basisAmountMinor": 12000,     // what the percentage was applied to
    "status": "ACCRUED",           // ACCRUED | PAID | REVERSED
    "accruedAt": "2026-08-31T10:15:00Z",
    "paidAt": null,
    "payoutReference": null
  }
]
```

A payout is a plain sum over `amountMinor`; do not compute it any other way. Sort/filter
client-side — the endpoint returns the full ledger for that collaborator, newest and oldest mixed
in insertion order.

```jsonc
GET /api/admin/collaborators/{id}/earnings/totals

→ 200
[ { "currency": "EUR", "accruedMinor": 21600, "paidMinor": 18000 } ]
```

One row per currency that collaborator has ever earned in; `accruedMinor` is what's currently owed
(status `ACCRUED`), `paidMinor` is what has already gone out (status `PAID`). Never sum these
across the array — a total across currencies is meaningless.

### Marking earnings paid

`POST /api/admin/collaboration-earnings/mark-paid` takes a **batch** — one or many ledger row ids
in a single call, all stamped with the same payout reference:

```jsonc
POST /api/admin/collaboration-earnings/mark-paid
{
  "earningIds": ["6b2a…", "7c3f…"],   // one or more ACCRUED row ids; empty array is rejected (400)
  "payoutReference": "SEPA-2026-08-31"   // required, max 200 chars — whatever the admin can reconcile against
}

→ 200   // no body
```

It records that a transfer happened; it moves no money itself. Every id in the batch must
currently be `ACCRUED` — if any row is `PAID` or `REVERSED` already, the whole call is refused with
`errorCode 5062 COLLABORATION_EARNING_NOT_PAYABLE` and **nothing** in the batch is marked (it is
one transaction), so double-paying is not possible. Re-fetch the ledger after a batch failure to
see which rows are actually in which state before retrying.

---

## 3b. Admin: house discount codes

All under `/api/admin/discount-codes`, all `ROLE_ADMIN`. No collaborator is involved anywhere on
this surface — these are the platform's own codes.

| Method | Path | Notes |
|---|---|---|
| `GET`/`POST` | `/api/admin/discount-codes` | |
| `PATCH` | `/api/admin/discount-codes/{codeId}` | |
| `POST` | `/api/admin/discount-codes/events/{eventId}/redemption/void` | |

### Creating and listing

```jsonc
POST /api/admin/discount-codes
{
  "code": "SUMMER10",             // A–Z, 0–9 and dashes only; stored uppercase
  "label": "Summer promo",        // What the host sees at checkout
  "discountPercent": 10,          // 0–99
  "startsAt": null,               // null means open-ended, both ends
  "endsAt": null,
  "maxRedemptions": null          // null means unlimited
}

→ 200
{
  "id": "1a2b…",
  "code": "SUMMER10",
  "label": "Summer promo",
  "discountPercent": 10,
  "status": "ACTIVE",
  "startsAt": null,
  "endsAt": null,
  "maxRedemptions": null,
  "liveRedemptions": 0
}
```

Same shape as a partner code (§3) minus `collaboratorId` and `commissionPercent` — there is no
partner to attribute anything to. `GET /api/admin/discount-codes` returns a bare array of every
house code. `liveRedemptions` means the same thing it does for a partner code: `PENDING + ACTIVE`
right now, checked against `maxRedemptions`. A duplicate code string is a `409`; a backwards
window is a `400`.

### Editing or disabling — no `code` field

```jsonc
PATCH /api/admin/discount-codes/{codeId}
{
  "label": "Summer promo — ended",
  "discountPercent": 10,
  "status": "DISABLED",           // ACTIVE | DISABLED — required, no default
  "startsAt": null,
  "endsAt": null,
  "maxRedemptions": null
}

→ 200   // same shape as create, liveRedemptions reflects current state
```

Same full-replace semantics as the partner-code `PATCH`: send every field back, not just the one
you're changing. Rate changes affect future redemptions only.

### Voiding a house redemption

```jsonc
POST /api/admin/discount-codes/events/{eventId}/redemption/void
{ "reason": "issued in error" }
```

Same shape and same mandatory `reason` as the partner-code void (§3). There is no commission to
unwind here, so this only detaches the code from the event — the host's order is untouched, same
as the partner case. Calling this on an event whose live code turns out to be a partner code (or
calling the partner void on a house code) is refused with `5060`; use the endpoint matching the
code's type.

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
| `5061` | `COLLABORATION_ALREADY_REDEEMED` | This event already has a different discount code (house or partner). |
| `5062` | `COLLABORATION_EARNING_NOT_PAYABLE` | That ledger row is not in `ACCRUED` state. |
