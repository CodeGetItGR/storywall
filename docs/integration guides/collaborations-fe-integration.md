# FE integration guide: B2B collaborations and checkout codes

Covers a change shipped 2026-08-31: a host can type a partner's code at activation checkout, and
platform admins get a surface for running those partnerships. Also covers a same-day follow-up:
**house discount codes**, the platform's own codes with no partner attached, which reuse every
endpoint on this page. See `frontend-integration-guide.md` §0 for base setup (auth header, the
RFC 7807 error envelope) and `billing-fe-guide.md` for the checkout flow this plugs into.

Nothing here is breaking. A client that sends no code keeps working exactly as before.

**2026-09-01 follow-up**, also non-breaking: a preview for the event-creation flow (§1b, no
`eventId` yet), upgrade pricing on the existing preview (§1, `targetPlanTierCode`), and per-code
event-type/plan restriction on the admin surfaces (§3, §3b).

**2026-09-01 second follow-up**, prompted by a host-visible gap: a discount applied at activation
inherits into a plan upgrade automatically (this already worked), but nothing told the frontend it
had — so an upgrade screen quoting a naive undiscounted price looked broken next to what Stripe
actually charged. Three additions, all non-breaking: `GET /api/events/{eventId}/billing` gains a
`discount` field (§ "Discount visibility" in `billing-fe-guide.md` §8); `collaborationCode` on §1's
preview is now optional, so the event's own already-applied code can be previewed without retyping
it (§1, "Blank code"); and a new §1c, `GET /upgrade-options`, returns every valid upgrade target
already fully priced — **use it instead of computing an upgrade's price client-side**, which
`plan-upgrades-fe-integration.md` §3 also now says.

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

### Upgrade preview: pass `targetPlanTierCode`

The upgrade screen (§2's `upgrade-checkout`) prices the **difference** between the event's current
plan and a more expensive target, not the target's full price. Previewing that gap now takes one
more, optional field:

```jsonc
POST /api/events/{eventId}/checkout/preview-code
{ "collaborationCode": "barn-2026", "targetPlanTierCode": "PREMIUM" }

→ 200
{
  "label": "Barn Venue partner rate",
  "discountPercent": 10,
  "combinedDiscountPercent": 10,
  "payableAmountMinor": 4500,   // the discounted GAP to PREMIUM, not PREMIUM's own price
  "currency": "EUR"
}
```

Omit `targetPlanTierCode` (or send it blank) for the activation-style preview from the section
above — that behaviour is unchanged. A `targetPlanTierCode` that isn't purchasable, or isn't
actually more expensive than the event's current plan, fails the same way `upgrade-checkout` itself
would (`404`/`409`, not the code-oracle `5060` — this is about the plan, not the code).

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

An over-long (>40 char) code fails validation with a `400` before reaching any of that. A **blank**
`collaborationCode` no longer fails validation — see below.

### Blank code: preview what's already applied

**2026-09-01:** `collaborationCode` may now be omitted or sent blank/whitespace. That previews the
event's **own already-applied code** instead of one being typed — the same code an upgrade already
inherits without a retype (§2). Use this on a screen that has no code field at all, such as the
upgrade picker in §1c.

```jsonc
POST /api/events/{eventId}/checkout/preview-code
{ "targetPlanTierCode": "PREMIUM" }   // collaborationCode omitted entirely

→ 200   // the event's own code, priced against PREMIUM's gap — same shape as a typed preview
```

If the event carries no code at all, this is refused — distinctly from a bad-code guess, since there
is no code being guessed:

```jsonc
→ 409
{ "status": 409, "errorCode": 5063, "errorKey": "NO_DISCOUNT_TO_PREVIEW",
  "detail": "This event has no discount code to preview; type one instead." }
```

Show a plain code-entry field in that case, not the `5060` "invalid code" copy — `5063` means
"nothing to fall back to," not "what you typed was wrong."

## 1b. Host: preview a code before the event exists

The event-creation form never saves a draft before "Pay" — pressing it creates the event **and**
opens checkout in the same action, with no save step in between. So a code typed on that form has
to be previewed against the form's own values, not an `eventId`:

```jsonc
POST /api/checkout/preview-code
{ "eventType": "WEDDING", "planTierCode": "PLUS", "collaborationCode": "barn-2026" }

→ 200   // same CodePreviewResponseDto shape as §1
```

Same rate limit (10/hour), same `5060` masking, same "preview binds nothing" rule as §1. The only
differences: no `eventId` in the path (`isAuthenticated()` is the whole auth check — there is
nothing to own yet, so no host check either), and `eventType`/`planTierCode` name what the host
picked on the form instead of being read off an event row. Both are validated exactly as event
creation itself validates them — an unknown `eventType`, one that's currently disabled platform-wide,
or a `planTierCode` not on sale (or not offered for that `eventType`) fails with the same error a
subsequent `POST /api/events` would give, **not** the masked `5060` — that masking is specific to
the code, not to the plan/type choice.

Once the host presses "Pay", create the event as normal and open checkout on the returned id — this
preview does not skip or replace either call, it only lets the UI show the discount before both
happen.

## 1c. Host: list upgrade options, fully priced

**New 2026-09-01.** Builds the upgrade picker (§2's `upgrade-checkout`) from one call, with nothing
for the client to compute — no code, no per-plan preview request, no client-side subtraction:

```jsonc
GET /api/events/{eventId}/upgrade-options

→ 200
[
  {
    "planTierCode": "PRO", "planTierName": "Pro", "currency": "EUR",
    "gapAmountMinor": 10000,
    "payableAmountMinor": 8000,
    "discountPercent": 20,
    "discountLabel": "Barn Venue partner rate"
  },
  {
    "planTierCode": "PREMIUM", "planTierName": "Premium", "currency": "EUR",
    "gapAmountMinor": 25000,
    "payableAmountMinor": 20000,
    "discountPercent": 20,
    "discountLabel": "Barn Venue partner rate"
  }
]
```

Host-only, `isAuthenticated()` + host check like every other endpoint on this page — but **no rate
limit of its own** and no code involved, unlike §1: there is nothing here for a caller to guess, so
it isn't sharing the 10/hour `collaboration.preview` bucket. Call it as often as the picker needs to,
including once per page view.

Already filtered and sorted — every entry is a real, purchasable, currently-valid upgrade target for
this event (public, assignable, offered for the event's type, priced above the current plan, same
currency), in catalog order. An event with no valid target returns `[]`, not a `404`.

**Field guide:**

| Field | Meaning |
|---|---|
| `gapAmountMinor` | The undiscounted difference between the two plans. Fine for a "was €100" strike-through, never for the price you charge. |
| `payableAmountMinor` | **The number to render as the price**, and what `POST /upgrade-checkout` will actually charge for this `planTierCode`. Already includes the target plan's own promotion and any code bound to the event, combined and clamped at the platform ceiling — same arithmetic `preview-code` (§1) and checkout itself both use. |
| `discountPercent` | The combined percent behind `payableAmountMinor`. **Absent** (not zero) when nothing discounts this particular target — check for its presence, don't compare to `0`. |
| `discountLabel` | Display text for whichever discount applied — the bound code's label if there is one, else the plan's own promotion label. Absent whenever `discountPercent` is absent. Carries no raw code and no partner identity, same rule as §1's `label`. |

A plan's own promotion and a bound code can both contribute to the same entry — `discountPercent` is
already their sum-then-clamp, and `discountLabel` shows only the more specific of the two (the code's,
when there is one) rather than trying to render both as if they stack into separate line items.

Nothing here binds or previews a specific code — this endpoint never touches redemption state, and
calling it does not count against §1's rate limit or affect anything a subsequent `preview-code` or
`upgrade-checkout` call does.

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
  is no field for it on that request. Build the picker from §1c rather than guessing at the price,
  and show the applied code anywhere the event's billing is displayed via `GET
  /api/events/{eventId}/billing`'s `discount` field (`billing-fe-guide.md` §8) — a host has no other
  way to be reminded a code is still active on their event.
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
  "maxRedemptions": null,       // null means unlimited
  "eventTypeKeys": null,        // null/empty means every event type; e.g. ["WEDDING"] to restrict
  "planTierCodes": null         // null/empty means every plan; e.g. ["PLUS"] to restrict
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
  "liveRedemptions": 0,
  "eventTypeKeys": [],
  "planTierCodes": []
}
```

`GET /api/admin/collaborators/{id}/codes` returns a bare array of the same shape, one entry per
code belonging to that collaborator. `liveRedemptions` counts `PENDING + ACTIVE` redemptions
against that code right now — this is what a cap (`maxRedemptions`) is checked against, so it is
the number to show next to it in the UI, not a lifetime total.

The two percentages are independent levers, not two views of one deal. A duplicate code string is a
`409`; a window that ends before it starts is a `400`.

### Restricting a code to event types and plans

`eventTypeKeys`/`planTierCodes` are always **codes and keys the admin picks from a list — never a
UUID**. An empty array (or omitting the field) means unrestricted, not "restricted to nothing"; a
code narrows only once an admin deliberately sets one. An unknown key (something not in the
platform's event-type registry) or an unknown plan code fails the whole write with a `400` — nothing
is partially saved.

These restrictions are enforced on the **host-facing** side too: a host typing a code that doesn't
apply to their event's type or plan gets the same masked `5060` §1 describes for every other
refusal reason — the frontend never needs to check this itself, and should not try to explain
*which* restriction failed.

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
  "maxRedemptions": null,
  "eventTypeKeys": null,        // full replace, same as everything else on this PATCH
  "planTierCodes": null
}

→ 200   // same CollaborationCodeResponseDto shape as create, liveRedemptions reflects current state
```

`eventTypeKeys`/`planTierCodes` are a full replace here too — send the current values back for
anything you don't mean to change, same as every other field on this `PATCH`.

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
  "maxRedemptions": null,         // null means unlimited
  "eventTypeKeys": null,          // null/empty means every event type
  "planTierCodes": null           // null/empty means every plan
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
  "liveRedemptions": 0,
  "eventTypeKeys": [],
  "planTierCodes": []
}
```

Same shape as a partner code (§3) minus `collaboratorId` and `commissionPercent` — there is no
partner to attribute anything to, and the same restriction rules from §3 ("Restricting a code to
event types and plans") apply here unchanged. `GET /api/admin/discount-codes` returns a bare array
of every house code. `liveRedemptions` means the same thing it does for a partner code:
`PENDING + ACTIVE` right now, checked against `maxRedemptions`. A duplicate code string is a `409`;
a backwards window is a `400`.

### Editing or disabling — no `code` field

```jsonc
PATCH /api/admin/discount-codes/{codeId}
{
  "label": "Summer promo — ended",
  "discountPercent": 10,
  "status": "DISABLED",           // ACTIVE | DISABLED — required, no default
  "startsAt": null,
  "endsAt": null,
  "maxRedemptions": null,
  "eventTypeKeys": null,          // full replace, same as everything else
  "planTierCodes": null
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
| `5063` | `NO_DISCOUNT_TO_PREVIEW` | A blank `collaborationCode` was previewed (§1) and the event carries no code to fall back to. |
