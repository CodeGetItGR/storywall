# Business buyers — FE integration

2026-09-24. Backend spec: `docs/superpowers/specs/2026-09-23-withdrawal-compliance-and-per-order-refunds-design.md` §5.
**Breaking for the frontend** (section 1). Everything after that is additive.

An account with a VIES-confirmed EU VAT number buys as a **business**. A business purchase has no
consumer right of withdrawal. Everyone pays the same VAT-inclusive price: there is no reverse
charge yet.

## 1. Checkout consent is optional for business buyers (breaking)

`requestsImmediateStart` and `acknowledgesWithdrawalTerms` on all three checkout bodies
(`/checkout`, `/upgrade-checkout`, `/storage-checkout`) are no longer required by the DTO. The rule
now depends on who is buying:

- **Consumer** (no business profile, or one that isn't `VALID`): both must be `true`, exactly as
  before. Missing or false → 400 `VALIDATION_FAILED` (3001). The response no longer carries per-field
  `errors` for these two, and it comes after the primary-host check (403 `PURCHASE_NOT_PRIMARY_HOST`)
  and the terms check (400 5072).
- **Business** (`GET /api/me/business-profile` says `business: true`): both may be omitted or
  `false`. Don't show the consumer withdrawal checkboxes. Show the business notice (section 3).
- `termsVersion` is required for everybody.

The checkout response gains `buyerType`:

```json
{ "orderId": "…", "redirectUrl": "https://checkout.stripe.com/…", "buyerType": "BUSINESS",
  "breakdown": { … } }
```

`breakdown` was added in phase 4 (2026-09-24). On a business order every item's `withdrawal` is
`BUSINESS_NO_RIGHT` and `breakdown.withdrawal.available` is `false`. See
[withdrawal-compliance-phase4-fe-integration.md](withdrawal-compliance-phase4-fe-integration.md).

## 2. The business profile

| Method | Path | |
|---|---|---|
| GET | `/api/me/business-profile` | 404 when there is none |
| PUT | `/api/me/business-profile` | create or replace; checks VIES; 10 per hour per user |
| DELETE | `/api/me/business-profile` | 204, even when there was none |

Only the account holder sets their own profile. Guest accounts can't (403), and admins can't set
one for somebody else: buying as a business gives up the right of withdrawal, so the holder has to
claim it themselves. The `PUT` rate limit counts every call, a 400 included.

```http
PUT /api/me/business-profile
{ "legalName": "Acme IKE", "countryCode": "EL", "vatNumber": "EL123456789",
  "addressLine1": "Ermou 1", "addressLine2": null, "city": "Athens", "postalCode": "10563" }
```

- `countryCode` is the **VIES** code: `EL` for Greece (not `GR`), `XI` for Northern Ireland. Only the
  27 EU states and `XI` are accepted. Anything else is 400 3001.
- `vatNumber`: with or without the prefix; spaces, dots, dashes and slashes allowed. It is stored
  without the prefix, so `EL 123.456.789` comes back as `123456789`. 400 3001 unless what's left is
  2–12 letters, digits, `+` or `*`.
- Lengths: `legalName`/`addressLine1`/`addressLine2` 200, `city` 100, `postalCode` 20. No newlines
  or other control characters in the name or address fields (400 3001): they go on the Stripe
  payment page.

Response (`BusinessProfileResponseDto`):

```json
{ "legalName": "Acme IKE", "countryCode": "EL", "vatNumber": "123456789",
  "addressLine1": "Ermou 1", "addressLine2": null, "city": "Athens", "postalCode": "10563",
  "viesStatus": "VALID", "viesSubmittedAt": "…", "viesCheckedAt": "…",
  "business": true }
```

`viesStatus`:
- `VALID`: the account buys as a business (`business: true`).
- `PENDING`: VIES couldn't answer (a member state's register was down, or checks are off in this
  environment). The account **buys as a consumer** until it's confirmed. The backend retries
  after 1 h, 2 h, 4 h, then every 8 h; 3 days after the save it gives up, marks the profile
  `INVALID` and emails the user (the 3 days is `app.vies.max-pending-days`). Say this on the
  settings screen, and at checkout. While VIES checks are off (`app.vies.enabled=false`, the
  default outside production) nothing is checked or retried: a profile stays `PENDING` for good and
  the account buys as a consumer, so the business flow can't be tried end to end there.
- `INVALID`: VIES says the number isn't registered. The account buys as a consumer. Let the user
  fix and save again.

Every `PUT` starts a new check, even when nothing changed.

## 3. What to show at checkout for a business buyer

The Stripe payment page footer for a business order reads:

> Business purchase for Acme IKE (VAT EL123456789). The consumer right of withdrawal does not apply
> to business purchases. The price includes VAT; no reverse charge is applied.

Show the same before redirecting, in place of the consumer withdrawal text. The price is the same
VAT-inclusive price a consumer pays. Stripe opens the session for a Customer carrying the business's
name, address and VAT number.

Since phase 4 (2026-09-24) the footer is written in the host's language (English or Greek), the
Stripe page lists each item on its own line, and the payment confirmation email carries a business
note in place of the withdrawal information and model form.

An open checkout is reused only for the same buyer. If the account becomes a business (or stops
being one, or saves new details) while a checkout is open, the next checkout gets a new order and a
new session.

## 4. Withdrawal

- `GET /api/events/{id}/billing` → each `orders[]` item gains `buyerType`. Hide "Withdraw" on
  `BUSINESS` orders.
- A business activation: the EVENT preview is `eligible: false` with refusal `BUSINESS_PURCHASE`.
  Filing the request anyway answers 409 `WITHDRAWAL_REFUSED` (5073), like any refusal, with the
  refusal's message as the detail.
- A business upgrade or pack on its own: the ORDER preview refuses with `BUSINESS_PURCHASE`, and the
  request answers 409 5073 the same way.
- An EVENT withdrawal of a consumer activation leaves business upgrades and packs unrefunded. The
  preview gains `excludedOrders` (empty otherwise):

```json
"excludedOrders": [
  { "orderId": "…", "orderKind": "STORAGE_PACK", "amountMinor": 500, "currency": "EUR",
    "reason": "BUSINESS_PURCHASE" }
]
```

  List them in the confirmation dialog: they are lost with the event and not refunded.
- The filed request (`WithdrawalResponseDto`, from `POST /api/events/{id}/withdrawals` and
  `GET /api/events/{id}/withdrawals`)
  carries the same `excludedOrders`, as they stood when it was filed. Show them on the request's
  history entry. The "withdrawal processed" notification and email also say how many business
  purchases, for how much, are not refunded.
- Withdrawing a consumer upgrade still takes every newer upgrade with it. A newer **business**
  upgrade in that chain is refunded pro rata (setup share kept). Every withdrawal line gains
  `buyerType`, so label such a line "business purchase".
- Business purchases never block handing primary host to someone else (5081).

## 5. Types

See `docs/frontend-api-types.ts`: `BusinessProfileRequestDto`, `BusinessProfileResponseDto`,
`ViesStatus`, `BuyerType`, `CheckoutResponseDto.buyerType`, `OrderSummary.buyerType`,
`WithdrawalLineDto.buyerType`, `WithdrawalPreviewDto.excludedOrders`,
`WithdrawalResponseDto.excludedOrders` and `WithdrawalExcludedOrderDto`. The consent booleans on the three checkout request types are now
optional.

Phase 4 (2026-09-24) then added `breakdown` to `CheckoutResponseDto` and `OrderSummary` (and to the
code previews and upgrade options); its `buyerType` matches the order's. See
[withdrawal-compliance-phase4-fe-integration.md](withdrawal-compliance-phase4-fe-integration.md).
