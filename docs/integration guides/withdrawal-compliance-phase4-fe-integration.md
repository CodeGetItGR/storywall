# Withdrawal compliance phase 4 — FE integration

2026-09-24. Backend spec: `docs/superpowers/specs/2026-09-23-withdrawal-compliance-and-per-order-refunds-design.md` §6.
Section 1 is **breaking**. Everything after it is additive.

Every price a host sees now comes from one object, the `PriceBreakdown`: the quote, the code
previews, the upgrade options, the checkout response, the Stripe page, the confirmation email and
the billing view. It lists each part of a purchase with its price and what a withdrawal does to it.

JSON nulls are sent, never omitted. Every field below is always present; "null" means the key is
there with the value `null`.

## 1. Breaking changes

- **Terms version is `2026-09-24`** (was `2026-09-17`). Read it from `GET /api/config`
  (`withdrawal.termsVersion`) and send it back on the three checkout bodies. A stale value is
  refused with 400 `WITHDRAWAL_TERMS_VERSION_STALE` (5072). Reload `/api/config` rather than caching
  it across a deploy.
- **The Stripe payment page changed.**
  - One line per breakdown item, at its discounted price, instead of one line for the whole order.
  - A discounted line's description reads "List €35.00 · −20%" (Greek: "Τιμή καταλόγου … · −20%").
  - The order summary (event, plan, coverage, modules) now rides under the first line.
  - A zero-amount row names the discounts already included: "Already included in the prices above:
    promotion "Launch offer" −10%, discount code "SUMMER" −10%." The names are dropped, and the
    percentages kept, when the row would pass 250 characters.
  - The footer (`custom_text.submit`) is new wording, per item, in English or Greek (the
    `Accept-Language` of the checkout request; anything but Greek gets English). Storage packs now
    have a footer too. It is pinned on the order, so a reissued session shows the same text.
  - Don't copy the footer onto your own review page. Show the breakdown instead (section 3 has
    every rule's text).
- **`breakdown` is added to four responses:** `CheckoutResponseDto`, `CodePreviewResponseDto`,
  `UpgradeOptionResponseDto.options[]` and `EventBillingResponseDto.orders[]` (`OrderSummary`).
  It is a new field, but a client with strict response validation will see it.
- **Upgrade-option figures are now read from the breakdown.** `payableAmountMinor` is
  `breakdown.totalMinor` and `gapAmountMinor` is `breakdown.listTotalMinor`, priced by the same code
  as `upgrade-checkout`, cap included. The numbers don't change: the cap only trims a code, and an
  upgrade takes none.

## 2. `PriceBreakdown`

Server type: `event_social_media.model.billing.PriceBreakdown`. TS: `PriceBreakdown` in
`docs/frontend-api-types.ts`.

### Worked example

An activation: a €100 coverage option (12 months), a 10% plan promotion "Launch offer", a 10% code
"SUMMER" (cap 30%), and one €3 add-on. The plan splits 5% setup, 60% event day, the rest coverage.
The event starts 2026-12-05 18:00 Athens time. These are the figures
`PriceBreakdownCalculatorTest#theSpecExampleComesOutAsWritten` checks:

```json
{
  "kind": "ACTIVATION",
  "currency": "EUR",
  "buyerType": "CONSUMER",
  "coverage": {
    "optionId": "…", "months": 12, "monthsAdded": null,
    "endsAt": "2027-12-05T16:00:00Z", "endsAtProjected": true
  },
  "items": [
    { "code": "ACTIVATION", "labelKey": "billing.item.activation", "name": "Premium",
      "listMinor": 500, "discountMinor": 100, "priceMinor": 400,
      "withdrawal": "RETAINED_ONCE_STARTED", "performedAt": null,
      "months": null, "monthsAdded": null, "paidServiceCode": null, "planTierCode": "PREMIUM", "storageBytes": null },
    { "code": "EVENT_DAY", "labelKey": "billing.item.eventDay", "name": "Premium",
      "listMinor": 6000, "discountMinor": 1200, "priceMinor": 4800,
      "withdrawal": "RETAINED_ONCE_PERFORMED", "performedAt": "2026-12-05T16:00:00Z",
      "months": null, "monthsAdded": null, "paidServiceCode": null, "planTierCode": "PREMIUM", "storageBytes": null },
    { "code": "COVERAGE", "labelKey": "billing.item.coverage", "name": "Premium",
      "listMinor": 3500, "discountMinor": 700, "priceMinor": 2800,
      "withdrawal": "PRO_RATA_BY_TIME", "performedAt": null,
      "months": 12, "monthsAdded": null, "paidServiceCode": null, "planTierCode": "PREMIUM", "storageBytes": null },
    { "code": "ADDON", "labelKey": "billing.item.addon", "name": "Wishlist",
      "listMinor": 300, "discountMinor": 0, "priceMinor": 300,
      "withdrawal": "RETAINED_ONCE_PERFORMED", "performedAt": "2026-12-05T16:00:00Z",
      "months": null, "monthsAdded": null, "paidServiceCode": "UNLOCK_WISHLIST", "planTierCode": null, "storageBytes": null }
  ],
  "discounts": [
    { "source": "PLAN_PROMOTION", "label": "Launch offer", "percent": 10 },
    { "source": "CODE", "label": "SUMMER", "percent": 10 }
  ],
  "combinedDiscountPercent": 20,
  "discountCapPercent": 30,
  "capApplied": false,
  "listTotalMinor": 10300,
  "discountTotalMinor": 2000,
  "totalMinor": 8300,
  "vat": { "included": true, "note": "billing.vat.included" },
  "termsVersion": "2026-09-24",
  "withdrawal": { "available": true, "windowDays": 14, "windowClosesAt": null }
}
```

All timestamps are UTC. The €80 plan price is split 400/4800/2800. The €20 discount is split the
same way, 100/1200/700, and each item's list is price plus discount. So the items always sum
exactly to the totals, and nothing is negative. Add-ons and storage packs are never discounted.

### Items by order kind

| `kind` | `items[].code`, in order |
|---|---|
| `ACTIVATION` | `ACTIVATION`, `EVENT_DAY`, `COVERAGE`, then one `ADDON` per add-on the event opted into |
| `UPGRADE` | `ACTIVATION`, `EVENT_DAY`, `COVERAGE` for the upgrade price, with the upgrade `labelKey`s. `name` is the target plan's |
| `STORAGE_PACK` | one `STORAGE_PACK` item; `discounts` is empty |

For a `BUSINESS` buyer every item's `withdrawal` is `BUSINESS_NO_RIGHT` and
`withdrawal.available` is `false`.

### Fields

Top level:

| Field | Null? | Meaning |
|---|---|---|
| `kind` | never | `ACTIVATION`, `UPGRADE` or `STORAGE_PACK` |
| `currency` | never | ISO code, e.g. `EUR` |
| `buyerType` | never | `CONSUMER` or `BUSINESS`: what the caller would buy as now (VIES-confirmed profile → `BUSINESS`) |
| `coverage` | never | see below |
| `items` | never | see below |
| `discounts` | never (may be empty) | the plan promotion, then the code. Each only when its percent is above 0 |
| `combinedDiscountPercent` | never | what came off the plan items. Can exceed `discountCapPercent`: a plan's own promotion is never cut back, only a code on top of it |
| `discountCapPercent` | never | the platform cap on promotion + code |
| `capApplied` | never | `true` when the cap cut the code back |
| `listTotalMinor`, `discountTotalMinor`, `totalMinor` | never | sums of the items' `listMinor`, `discountMinor`, `priceMinor` |
| `vat` | never | `{ included: true, note: "billing.vat.included" }`. Always included; no reverse charge |
| `termsVersion` | never | the terms version in force when this was priced |
| `withdrawal` | never | see below |

`coverage`:

| Field | Null? | Meaning |
|---|---|---|
| `optionId` | never | the coverage option priced: the event's own for an activation or a pack, the target for an upgrade |
| `months` | in practice never | that option's months |
| `monthsAdded` | except on `UPGRADE` | months the upgrade adds, `0` for a same-length upgrade |
| `endsAt` | pre-creation preview; an upgrade or pack of an event with no coverage end | when coverage ends. On a draft's activation it assumes payment now. On a paid event's code preview, and on upgrades and packs, it is the event's pinned end (plus `monthsAdded` for an upgrade) |
| `endsAtProjected` | never | `true` on a draft's `ACTIVATION` breakdown (the end assumes payment now); `false` on a paid event's code preview (its end was pinned at activation), on `UPGRADE` and on `STORAGE_PACK` |

`items[]`:

| Field | Null? | Meaning |
|---|---|---|
| `code` | never | `PriceItemCode` |
| `labelKey` | never | a message key; render it as in section 3 |
| `name` | never | the plan's name on the three plan items, the catalog name on `ADDON` and `STORAGE_PACK` |
| `listMinor`, `discountMinor`, `priceMinor` | never | `listMinor = priceMinor + discountMinor`. Charge and show `priceMinor` |
| `withdrawal` | never | `WithdrawalRule`; render with `billing.rule.<value>` |
| `performedAt` | on `ACTIVATION`, `COVERAGE`, `STORAGE_PACK`; and before the event exists | the event's start, on `EVENT_DAY` and `ADDON` |
| `months` | except on `COVERAGE` | the coverage option's months |
| `monthsAdded` | except on an upgrade's `COVERAGE` | months gained |
| `paidServiceCode` | except on `ADDON` and `STORAGE_PACK` | the catalog code |
| `planTierCode` | except on the three plan items | the plan priced (the target, on an upgrade) |
| `storageBytes` | except on `STORAGE_PACK` | bytes the pack grants |

`discounts[]`: `source` (`PLAN_PROMOTION` or `CODE`), `label` and `percent` (that discount's own
headline percent, before the cap). A promotion's `label` is null when it was set up without one. A
code's `label` is the label its owner gave it, or null when it has none: the raw code string is
never shown back (render the null case as "discount code −N%", the `billing.discount.CODE.unnamed`
wording).

`withdrawal`:

| Field | Null? | Meaning |
|---|---|---|
| `available` | never | `false` for a business buyer |
| `windowDays` | never | the window's length. On a `PAID` order in the billing view, the length enforced for that order: the longer of the one stated at checkout and the one configured now |
| `windowClosesAt` | in quotes, previews, upgrade options and checkout responses; in the billing view unless the order is `PAID` and a consumer's | when the window closes. Exclusive: midnight Athens time at the start of the day after the last day, pushed past a weekend. May be in the past |

## 3. Labels and rules

Render `labelKey` with these placeholders (as `CheckoutText#itemName` does for Stripe and email):

| Placeholder | Value |
|---|---|
| `{plan}` | `item.name` |
| `{name}` | `item.name` |
| `{monthsText}` | `billing.months.one` when `item.months` is 1, else `billing.months.other`, each with `{months}` = `item.months` |
| `{added}` | `" (+N)"` with N = `item.monthsAdded` when it is above 0; otherwise the empty string (a same-length upgrade shows no "(+0)") |

So an 18-month upgrade adding 6 months to plan "Premium" reads "Upgrade to Premium — 18 months (+6)".

Texts, copied from `src/main/resources/i18n/messages.properties` and `messages_el.properties`:

| Key | EN | EL |
|---|---|---|
| `billing.item.activation` | Activation — {plan} | Ενεργοποίηση — {plan} |
| `billing.item.eventDay` | Event day — {plan} | Ημέρα εκδήλωσης — {plan} |
| `billing.item.coverage` | Coverage — {monthsText} | Κάλυψη — {monthsText} |
| `billing.item.upgrade.setup` | Upgrade to {plan} — setup | Αναβάθμιση σε {plan} — ενεργοποίηση |
| `billing.item.upgrade.eventDay` | Upgrade to {plan} — event day | Αναβάθμιση σε {plan} — ημέρα εκδήλωσης |
| `billing.item.upgrade.coverage` | Upgrade to {plan} — {monthsText}{added} | Αναβάθμιση σε {plan} — {monthsText}{added} |
| `billing.item.addon` | Add-on — {name} | Πρόσθετο — {name} |
| `billing.item.storagePack` | Storage pack — {name} | Πακέτο αποθήκευσης — {name} |
| `billing.months.one` | {months} month | {months} μήνας |
| `billing.months.other` | {months} months | {months} μήνες |
| `billing.rule.RETAINED_ONCE_STARTED` | not refundable | δεν επιστρέφεται |
| `billing.rule.RETAINED_ONCE_PERFORMED` | not refunded once your event starts or the date you paid for passes | δεν επιστρέφεται μόλις ξεκινήσει η εκδήλωσή σας ή περάσει η ημερομηνία για την οποία πληρώσατε |
| `billing.rule.PRO_RATA_BY_TIME` | refunded pro rata for the unused time | επιστρέφεται αναλογικά για τον χρόνο που δεν χρησιμοποιήθηκε |
| `billing.rule.BUSINESS_NO_RIGHT` | business purchase, no right of withdrawal | αγορά ως επιχείρηση, χωρίς δικαίωμα υπαναχώρησης |
| `billing.vat.included` (`vat.note`) | Prices include VAT. | Οι τιμές περιλαμβάνουν ΦΠΑ. |

To name the discounts the way the payment page does (optional), with `{label}` and `{percent}`
from `discounts[]`; use the `.unnamed` key when `label` is null or blank:

| Key | EN | EL |
|---|---|---|
| `billing.discount.PLAN_PROMOTION` | promotion "{label}" −{percent}% | προσφορά «{label}» −{percent}% |
| `billing.discount.PLAN_PROMOTION.unnamed` | plan promotion −{percent}% | προσφορά πακέτου −{percent}% |
| `billing.discount.CODE` | discount code "{label}" −{percent}% | κωδικό έκπτωσης «{label}» −{percent}% |
| `billing.discount.CODE.unnamed` | discount code −{percent}% | κωδικό έκπτωσης −{percent}% |

The `checkout.footer.*`, `checkout.summary.*`, `billing.line.discounted`, `billing.discount.row*`
and `billing.receipt.discounted` keys are for the Stripe page and the email only.

## 4. Where to read it

| Where | `breakdown` |
|---|---|
| `POST /api/events/{eventId}/quote` **(new)** | the response body is a `PriceBreakdown` |
| `POST /api/events/{eventId}/checkout/preview-code` | `CodePreviewResponseDto.breakdown`: the activation with the code applied, add-ons included (`payableAmountMinor` stays the plan items alone). On an upgrade preview, the upgrade |
| `POST /api/checkout/preview-code` (pre-creation) | `CodePreviewResponseDto.breakdown`: no add-ons, `coverage.endsAt` and every `performedAt` null |
| `GET /api/events/{eventId}/upgrade-options` | `options[].breakdown`: what `upgrade-checkout` would pin for that option |
| `POST …/checkout`, `…/upgrade-checkout`, `…/storage-checkout` | `CheckoutResponseDto.breakdown`: the order's pinned breakdown, what Stripe charges |
| `GET /api/events/{eventId}/billing` | `orders[].breakdown`: as pinned, with the window filled while `PAID`. Null on orders from before V106 |

`breakdown` is never null on the first four; only `OrderSummary.breakdown` can be.

A paid event's code preview leaves out the event's storage packs and shows the coverage end pinned
at activation.

### `POST /api/events/{eventId}/quote`

Prices an activation or a storage pack for the review page, before any checkout is opened.
Read-only: it redeems nothing, opens nothing and needs no consent.

```http
POST /api/events/{eventId}/quote
{ "kind": "ACTIVATION" }

POST /api/events/{eventId}/quote
{ "kind": "STORAGE_PACK", "paidServiceCode": "STORAGE_5GB" }
```

- `kind`: required, `ACTIVATION` or `STORAGE_PACK`. `UPGRADE` is 400: upgrades are quoted by
  `GET upgrade-options`.
- `paidServiceCode`: required for `STORAGE_PACK`, refused for `ACTIVATION`. Max 64, `[A-Z0-9_]+`.
- Any other field is 400.
- Primary host only. 60 requests per minute per user (`checkout.quote`).
- An activation quote includes a code the draft has already redeemed. A code typed at checkout is
  not in the quote: it is redeemed then (or refused). To show a typed code's price first, use
  `preview-code`.
- **An open checkout keeps its price** until it expires (24 h). When pressing Pay would reuse the
  event's open (PENDING) order, the quote returns that order's pinned breakdown, so the quote and
  the payment page agree even if the catalog changed in between. An open order is replaced instead
  (and priced afresh) when it has expired, or when the plan, option, add-ons, code, buyer, event
  date or terms version changed since.

Errors. It makes the same refusals as the matching checkout, before pricing:

| HTTP | `errorCode` | When |
|---|---|---|
| 400 | 3001 `VALIDATION_FAILED` | `kind` missing or `UPGRADE`; `paidServiceCode` missing for a pack, sent for an activation, or not matching the pattern |
| 400 | 3002 `MALFORMED_REQUEST_BODY` | an unknown field, an unknown `kind` value, or unparseable JSON |
| 400 | 3008 `EVENT_DATES_INCOMPLETE` | activation: no start date, or the end is not after the start |
| 400 | 3015 `INVALID_PAID_SERVICE_KIND` | pack: the code is not a storage pack |
| 403 | 4001 `FORBIDDEN` | the caller is not a member of the event (this includes an event id that doesn't exist) |
| 403 | 4006 `PURCHASE_NOT_PRIMARY_HOST` | a member who is not the primary host |
| 404 | 2001 `RESOURCE_NOT_FOUND` | a soft-deleted event; pack: an unknown `paidServiceCode` |
| 409 | 5017 `EVENT_NOT_DRAFT` | activation on an event that is not a draft |
| 409 | 5014 `EVENT_NOT_ACTIVE` | pack on a draft |
| 409 | 5015 `PLAN_TIER_NOT_PURCHASABLE` | activation: the event's plan is archived or not public |
| 409 | 5019 `PLAN_TIER_NOT_PRICED` | activation: the plan has no currency or no duration on sale |
| 409 | 5078 `COVERAGE_OPTION_UNAVAILABLE` | activation: the draft's duration is no longer sold |
| 409 | 5039 `PAID_SERVICE_CURRENCY_MISMATCH` | activation: an add-on is priced in another currency than the plan |
| 409 | 5036 `PAID_SERVICE_NOT_PURCHASABLE` | pack: archived or not public |
| 409 | 5040 `PAID_SERVICE_NOT_ON_PLAN` | pack: not offered on the event's plan |
| 409 | 5038 `ADDON_ALREADY_ACTIVE` | pack: already bought for this event |
| 409 | 5084 `PURCHASE_WITHDRAWAL_OPEN` | pack: a withdrawal of the whole event is under review (PENDING or HELD) |
| 409 | 5021 `PLAN_TIER_CURRENCY_UNSUPPORTED` | the price is in a currency the platform can't charge |
| 409 | 5046 `CHECKOUT_AMOUNT_BELOW_MINIMUM` | the price is above 0 but below the provider's minimum |
| 429 | 3010 `RATE_LIMITED` | over 60 per minute |

What the quote can't predict:
- **409 `CHECKOUT_SESSION_UNRESOLVED` (5031) at Pay.** When checkout has to replace an open order
  (see above) and Stripe won't confirm that order's session can no longer be paid. Tell the host to
  try again shortly.
- **A code typed at checkout**, which is redeemed then or refused.

### The review page

- Before checkout: show the quote (activation, pack), the `preview-code` breakdown (with a typed
  code), or the chosen `upgrade-options[].breakdown` (upgrade).
- Once checkout is opened: show `checkout.breakdown` from the response, not the quote. It is what
  Stripe charges, and a reissued order returns the same one.
- Per item: the rendered label, `priceMinor` (with `listMinor` struck through when `discountMinor`
  is above 0), and the rule text. Then the discounts, the total, the VAT note and, for a consumer,
  "You can withdraw within `withdrawal.windowDays` days of payment".
- A business buyer: the business notice from `business-buyers-fe-integration.md` §3 instead of the
  rules.

## 5. Legal texts

| Method | Path | |
|---|---|---|
| GET | `/api/legal/withdrawal-terms?locale=en\|el` | the current version |
| GET | `/api/legal/withdrawal-terms/{version}?locale=en\|el` | one version |

- Public: no auth.
- Response (`WithdrawalTermsDto`):

  ```json
  { "version": "2026-09-24", "locale": "el",
    "withdrawalInformation": "# Δικαίωμα υπαναχώρησης\n…", "modelForm": "# …" }
  ```

  Both texts are Markdown (headings, bold, lists). Render them as Markdown.
- `locale`: `en` or `el`, any case. Anything else, or none, falls back to `en`; the response's
  `locale` says which one was served. `el-GR` is not recognised and gets `en`: send `el`.
- 404 (2001) for a version with no texts, or one that isn't a `YYYY-MM-DD` date. Only
  `2026-09-24` has texts; `2026-09-17` is 404.
- Link the current version from the checkout consent step. For a paid order, link its version:
  `orders[].breakdown.termsVersion` (the version the checkout acknowledged, since checkout refuses
  any other). Orders from before V106 have no breakdown and no texts.
- The texts are drafts: launch is blocked on lawyer review. They name the trader from backend
  config (`app.legal.trader-*`): blank by default, required when payments go through Stripe.

## 6. The withdrawal function (Art. 11a)

Directive 2023/2673 requires a withdrawal function that is easy to find for the whole withdrawal
period.

- **Button:** "Withdraw from contract here" / "Υπαναχώρηση από τη σύμβαση εδώ". The Greek wording
  is pending lawyer confirmation. The legal texts and the payment-page footer use the same label,
  so keep it verbatim.
- **Confirm step:** "Confirm withdrawal" / "Επιβεβαίωση υπαναχώρησης".
- **Where:** prominent on the event's billing page, per event and per order. Show it for an order
  while `breakdown.withdrawal.available && now < breakdown.withdrawal.windowClosesAt`. It is
  hidden for business orders (`available: false`) and once the order isn't `PAID`
  (`windowClosesAt` null). For an order with a null `breakdown` (before V106), use the withdrawal
  preview's `eligible` and `windowClosesAt` instead.
- **Which endpoints:**

  | Order | Preview | File |
  |---|---|---|
  | the `ACTIVATION` (withdraws the whole event, which is then deleted) | `GET /api/events/{eventId}/withdrawal-preview` | `POST /api/events/{eventId}/withdrawals` |
  | an `UPGRADE` (takes every newer upgrade with it) or a `STORAGE_PACK` | `GET /api/events/{eventId}/orders/{orderId}/withdrawal-preview` | `POST /api/events/{eventId}/orders/{orderId}/withdrawals` |

- **Flow:** button → call the preview and show its result (amount, refusals, excluded business
  orders, storage left) → confirm step → file.
- **The form:** show the host's name and email (from `GET /api/me`) and the order, read-only; the
  acknowledgement goes to the account's email. The body is `{ "reason": "…" }`, optional, max 1000
  characters; the body itself may be omitted.
- **Answers:** 201 with the request when `REFUNDED` or `HELD`; 409 `WITHDRAWAL_REFUSED` (5073)
  when refused, with the reasons as `detail`. Primary host only (403 4005). 5 filings per hour per
  user, shared by both endpoints. The activation on the order endpoint is 400 5082.
- Every filing gets an acknowledgement email, refused ones included (section 7). Don't send one
  from the FE.

## 7. Emails the host now receives

The backend sends these. The FE must not send its own. Both are in English or Greek, from the
recipient's stored locale (Greek when it is `el`, English otherwise), and both link to
`/events/{eventId}/settings/plan`: host the billing page there.

**Payment confirmation**, once per order when its payment settles (activation, upgrade, pack), to
the account that paid:
- the items, each with its price (and list price and discount when discounted) and its rule;
- the total and the VAT note;
- when coverage ends;
- for a consumer, the last moment to withdraw (Athens time), then the full withdrawal information
  and the model withdrawal form for the order's terms version, as plain text in the body;
- for a business, a note that the consumer right of withdrawal doesn't apply, instead of the texts.

It is not sent for an order with no recorded buyer (before V102) or no breakdown (before V106).
Dates in these emails are Athens time and say so.

Two variants replace it:
- **No charge**, when an admin settles the order by hand (a comp): "applied at no charge", with no
  items, no receipt and no withdrawal text, since nothing was paid.
- **We'll refund your payment**, when the payment arrived but bought nothing: the event was
  deleted, an activation found the event already live, a storage pack was already held, or an
  upgrade would now shorten the event's coverage. It says nothing was added and the payment will be
  refunded in full (an admin does it by hand; the backend logs each case at ERROR). A comp that
  applied nothing sends no email. These are last-resort cases: one open checkout per event and
  kind, and a replaced session expired at Stripe first, keep a host from paying twice.

**Withdrawal received**, for every filing that reaches a decision (`REFUNDED`, `HELD` or
`REFUSED`), to the account that filed it:
- when it was received;
- the scope (the whole event, or one purchase);
- each order it names: kind, amount, payment date;
- the outcome: the amount on its way back (or that nothing is left to refund), held for review
  until a date, or refused with the reasons. When Stripe refused the refund, it says the amount is
  owed and will be returned by hand instead of "on its way back".

A request stopped before that (403, 404, 400 5082, 429, a validation error) gets no email.

The existing `WITHDRAWAL_REFUNDED` and `WITHDRAWAL_HELD` notifications (in-app and email) still
fire as well.

## 8. Types

See `docs/frontend-api-types.ts`: `PriceBreakdown`, `PriceBreakdownCoverage`,
`PriceBreakdownItem`, `PriceBreakdownDiscount`, `PriceBreakdownVat`, `PriceBreakdownWithdrawal`,
`PriceItemCode`, `WithdrawalRule`, `DiscountSource`, `QuoteRequestDto`, `WithdrawalTermsDto`, and
`breakdown` on `CheckoutResponseDto`, `CodePreviewResponseDto`, `UpgradeOptionEntry` and
`OrderSummary`. `OrderSummary.amountMinor` and `currency` are now typed non-null (they always were).
