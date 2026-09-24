# FE integration: coverage options — each plan sold at several durations

> **Breaking change.** `POST /api/events`, the pre-creation code preview, the upgrade picker and
> upgrade checkout all change shape, and three fields the frontend may read are gone. Section 10
> lists every one. Backend: [design](../superpowers/specs/2026-09-23-plan-coverage-options-and-extensions-design.md),
> phase 1.

## Why this exists

An EVENT plan used to have one price and one term: Plus cost €99 and kept the event for 12 months.
Now each plan is sold at several durations, each priced separately — say Start at €49 for 3
months, €59 for 6 or €69 for 9. The host picks the plan **and** the duration. The duration decides
how long the event is covered after activation, which used to come from the plan.

Phase 1 (this guide) covers the catalog, choosing a duration on the draft, activation, upgrades
and the admin screens. Buying *extra* coverage after activation — extensions — is phase 2. Its
list is already on the catalog (`extensionOptions`), but nothing sells it yet. See section 11.

## The model

```
PlanTier (EVENT scope)
 ├─ initialOptions[]     the durations the plan is sold at; the host picks one on the draft
 └─ extensionOptions[]   extra months bought after activation (phase 2; not sold yet)
```

Every option has the same shape:

```ts
interface CoverageOptionResponseDto {
  id: string;               // UUID; what every request below takes as coverageOptionId
  kind: 'INITIAL' | 'EXTENSION';
  months: number;           // 1–120
  priceAmountMinor: number; // in the plan's priceCurrency, before any promotion or code
  sortOrder: number;
  active: boolean;          // always true on public responses
}
```

An event is always on exactly one of its plan's INITIAL options. The option's `months` set
`coverageEndsAt` at activation. After that, `coverageEndsAt` is pinned, and only a paid upgrade
moves it (or that upgrade's refund, which puts the event back on the previous still-paid order's
plan and duration and takes the window back by the gap between the two).

## 1. Reading the catalog

Both public plan reads carry the two lists:

- `GET /api/config` → `planTiers[]`, for the pricing page
- `GET /api/plan-tiers?eventType=WEDDING`, for the creation form

```json
{
  "code": "START",
  "scope": "EVENT",
  "name": "Start",
  "priceAmountMinor": null,
  "priceCurrency": "EUR",
  "discountPercent": null,
  "initialOptions": [
    { "id": "8f1c…", "kind": "INITIAL", "months": 3, "priceAmountMinor": 4900, "sortOrder": 0, "active": true },
    { "id": "2a77…", "kind": "INITIAL", "months": 6, "priceAmountMinor": 5900, "sortOrder": 1, "active": true },
    { "id": "c03e…", "kind": "INITIAL", "months": 9, "priceAmountMinor": 6900, "sortOrder": 2, "active": true }
  ],
  "extensionOptions": []
}
```

- **An EVENT plan has no price of its own any more.** Its `priceAmountMinor` is always `null`; the
  prices are on the options. A "from €49" label is the lowest `initialOptions[].priceAmountMinor`.
  `priceCurrency` still names the currency, and ACCOUNT plans still use `priceAmountMinor`.
- **Render the lists in the order given.** They arrive sorted by `sortOrder` and then by `months`.
- **Public responses list live options only.** A retired option disappears from them; `active` is
  always `true` there.
- **A plan with an empty `initialOptions` is not on sale.** Show it as unavailable, or leave it out.
  Creating an event on it fails.
- **`autoDeleteMonths` is gone** from every plan response. It was the plan's single term; the
  term is now the option's `months`.
- The plan's promotion (`discountPercent`, `discountLabel`, `discountStartsAt`, `discountEndsAt`)
  applies to every duration of the plan, exactly as it applied to the plan's single price before.

## 2. Creating the draft

`POST /api/events` takes the chosen option's `id` next to the plan:

```json
{
  "title": "Anna & Nikos",
  "eventType": "WEDDING",
  "planTierCode": "START",
  "coverageOptionId": "2a77…",
  "startAt": "2027-06-12T16:00:00+03:00"
}
```

`coverageOptionId` is **required** when a host creates an event. The response is
**400 `COVERAGE_OPTION_INVALID` (5077)** when it is missing, unknown, retired, an EXTENSION option,
or belongs to another plan. Pre-select a sensible default in the form — the first option, or the
one the pricing page came from — so that an untouched form still sends one.

`projectedCoverage.hostingMonths` on the event response is the chosen option's `months`.

## 3. Changing the duration on the draft

`PATCH /api/events/{eventId}` accepts `coverageOptionId`:

- **DRAFT only.** Once the event is paid for, a *different* option is **409 `EVENT_NOT_DRAFT`**. After
  payment the duration changes only through an upgrade (section 6).
- **Sending the event's current option back is always a no-op**, even on a paid event. An edit form
  can resubmit everything it loaded.
- It must be a live INITIAL option of the event's **own** plan, or the response is
  **400 `COVERAGE_OPTION_INVALID`**.

The event response does not carry the option. Read the current one from the billing view
(section 7).

## 4. Code previews before paying

- **Creation form, before the event exists:** `POST /api/checkout/preview-code` now **requires**
  `coverageOptionId`, because the price being discounted is that duration's:

  ```json
  { "eventType": "WEDDING", "planTierCode": "START", "coverageOptionId": "2a77…", "collaborationCode": "ANNA10" }
  ```

  The response is 400 `COVERAGE_OPTION_INVALID` when the option is not a live one of that plan.
- **Existing draft:** `POST /api/events/{eventId}/checkout/preview-code` without a target plan
  quotes the event's own duration. There is nothing new to send.

## 5. Activation checkout

`POST /api/events/{eventId}/checkout` is unchanged on the wire. It charges the event's option price,
after the plan's promotion and any code.

- **409 `COVERAGE_OPTION_UNAVAILABLE` (5078):** the duration on the draft has been retired since the
  host picked it. Nothing is charged. Send the host back to pick another duration
  (`PATCH … coverageOptionId`, section 3), then retry. The draft's code preview answers the same.
- **409 `PLAN_TIER_NOT_PRICED` (5019)** now means "this plan has no duration on sale, or no
  currency". Before, it meant "this plan has no price".
- The Stripe line item's description gains a clause, `Coverage: 6 months`.
- The months are pinned on the order when checkout opens. If an admin reprices or retires the
  option while the host is on Stripe's page, the host still gets the duration and price they saw.
- **Switching the duration after opening checkout.** The open session was priced for the old
  duration, so the next `checkout` call does not hand it back. It expires that session and opens
  one priced for the new duration. Until that call, the old session is still payable. A host who
  pays it in another tab buys the old duration, and the event goes live on that one, whatever the
  draft says. Re-read the billing view after the return URL (section 7) rather than assuming the
  draft's choice won.

## 6. Upgrades

The rule: a paid event can move to a higher plan at any of that plan's durations **at least as
long as its own** that costs more than its own. The host pays the gap between the two durations'
current prices, less the target plan's promotion. When the payment settles, the event moves onto
the new plan and duration, and `coverageEndsAt` moves later by the extra months. A same-length
upgrade adds none.

### `GET /api/events/{eventId}/upgrade-options` — new shape

It now returns one entry per target plan, with that plan's eligible durations inside:

```json
[
  {
    "planTierCode": "PLUS",
    "planTierName": "Plus",
    "currency": "EUR",
    "discountPercent": 10,
    "discountLabel": "Spring offer",
    "options": [
      { "coverageOptionId": "d41b…", "months": 6,  "monthsAdded": 0, "gapAmountMinor": 3000, "payableAmountMinor": 2700 },
      { "coverageOptionId": "e9a0…", "months": 12, "monthsAdded": 6, "gapAmountMinor": 5000, "payableAmountMinor": 4500 }
    ]
  }
]
```

- `payableAmountMinor` is exactly what checkout will charge. `gapAmountMinor` is the undiscounted
  gap, for a strike-through.
- `discountPercent` and `discountLabel` are the target plan's own promotion, or `null`. A code
  redeemed on the event bought its activation and does not reach an upgrade.
- `options` is never empty; a plan with no eligible duration is left out. An empty array means
  there is nothing to upgrade to.
- **Removed:** the entry-level `gapAmountMinor` and `payableAmountMinor`. They are per option now.

### `POST /api/events/{eventId}/upgrade-checkout`

It now **requires** `coverageOptionId`, one of the entry's `options[].coverageOptionId`:

```json
{
  "planTierCode": "PLUS",
  "coverageOptionId": "e9a0…",
  "requestsImmediateStart": true,
  "acknowledgesWithdrawalTerms": true,
  "termsVersion": "2026-09-17"
}
```

- **400 `COVERAGE_OPTION_INVALID`:** the option is not a live duration of that plan.
- **409 `PLAN_TIER_NOT_AN_UPGRADE`:** the option is shorter than the event's current duration
  (message: "An upgrade keeps at least the N months this event has."), or it does not cost more.
  Neither happens if the picker only offers what `upgrade-options` listed.

### Upgrade code preview

`POST /api/events/{eventId}/checkout/preview-code` with a `targetPlanTierCode` now also requires
`targetCoverageOptionId`, the duration being considered. Without it, or with one that is not a live
duration of that plan, the response is 400 `COVERAGE_OPTION_INVALID`.

## 7. The billing view

`GET /api/events/{eventId}/billing` is where the frontend reads which duration an event is on:

```json
{
  "eventStatus": "ACTIVE",
  "planTierCode": "PLUS",
  "planTierName": "Plus",
  "coverageOptionId": "e9a0…",
  "coverageMonths": 12,
  "orders": [
    { "kind": "UPGRADE",    "coverageMonths": 12, "coverageMonthsAdded": 6 },
    { "kind": "ACTIVATION", "coverageMonths": 6,  "coverageMonthsAdded": null }
  ]
}
```

(Orders are abbreviated; their existing fields are unchanged.)

- `coverageOptionId` / `coverageMonths`: the duration the event is on today.
- `orders[].coverageMonths`: the months that order bought. It is `null` on an order that buys no
  coverage, such as a storage pack.
- `orders[].coverageMonthsAdded`: UPGRADE only — how far it moved `coverageEndsAt`. It is `null` on
  every other kind.

## 8. Admin screens

### Managing a plan's durations

| Method | Path | Body | Returns |
|---|---|---|---|
| `GET` | `/api/admin/plan-tiers/{planTierId}/coverage-options` | — | every option, retired ones included |
| `POST` | `/api/admin/plan-tiers/{planTierId}/coverage-options` | `{ kind, months, priceAmountMinor, sortOrder? }` | the created option (200) |
| `PATCH` | `/api/admin/plan-tiers/{planTierId}/coverage-options/{optionId}` | `{ priceAmountMinor?, sortOrder?, active? }` | the updated option |

All three are `ADMIN` only.

- **`kind` and `months` never change.** The PATCH body has no such fields, and sending one is a 400.
  To sell a different length, add an option and retire the old one.
- **Retiring is `active: false`; nothing is ever deleted.** Events and orders keep pointing at their
  option. A retired option stays in the admin list and can be reactivated.
- **409 `COVERAGE_OPTION_DUPLICATE` (5080):** the plan already sells a live option of that kind and
  length. This applies both when adding one and when reactivating one.
- **409 `COVERAGE_OPTION_LAST_INITIAL` (5079):** it would retire the last live INITIAL option of a
  public, assignable plan, which would take the plan off sale. Add another first, or take the plan
  off the menu.
- **400 `INVALID_PLAN_TIER_SCOPE` (3007):** the plan is ACCOUNT-scope. Only EVENT plans have
  durations.
- Admin plan responses (`GET /api/admin/plan-tiers`, `GET /api/admin/plan-tiers/{id}`) carry both
  lists with retired options included, marked `active: false`.
- Duplicating a plan copies all its options, retired ones included.

### Creating and editing plans

- `autoDeleteMonths` is gone from the create and patch bodies. Sending it is a 400, since unknown
  fields are refused.
- `priceAmountMinor` on an **EVENT** plan is **400 `INVALID_PLAN_TIER_SCOPE`**. Price the plan
  through its coverage options. ACCOUNT plans still take a price.
- A new EVENT plan starts with no options, so it is not on sale until one is added.

### Provisioning an event for a promoter

`POST /api/admin/events` takes `event.coverageOptionId` as **optional**. Without it, the event gets the plan's shortest duration. If the plan sells no
duration at all, the response is **409 `COVERAGE_OPTION_UNAVAILABLE`**.

### Assigning a plan to an event

`PATCH /api/admin/events/{eventId}/plan-tier` takes an optional `coverageOptionId`:

- With it, the event moves onto that duration of the new plan (400 `COVERAGE_OPTION_INVALID` if it
  is not a live one).
- Without it, the event keeps its term: it gets the option of the same length on the new plan,
  else that plan's shortest. If the plan sells none, the response is 409
  `COVERAGE_OPTION_UNAVAILABLE`.
- **Either way, `coverageEndsAt` does not move.** An assignment changes what the event is on, not
  how long it is covered. Before this change, an assignment could shift coverage by the difference
  between the two plans' terms.

## 9. Error codes

| Code | Name | HTTP | When |
|---|---|---|---|
| 5077 | `COVERAGE_OPTION_INVALID` | 400 | The option is unknown, retired, the wrong kind, or another plan's; or missing where the service requires it (event create, admin event create, `targetCoverageOptionId`). Missing on the new-event preview or upgrade checkout is `400 VALIDATION_FAILED` (3001) instead |
| 5078 | `COVERAGE_OPTION_UNAVAILABLE` | 409 | The draft's duration was retired since; or a plan sells no duration to default to |
| 5079 | `COVERAGE_OPTION_LAST_INITIAL` | 409 | Admin: retiring the last duration a plan on sale is sold at |
| 5080 | `COVERAGE_OPTION_DUPLICATE` | 409 | Admin: the plan already sells a live option of that kind and length |
| 5019 | `PLAN_TIER_NOT_PRICED` | 409 | *Changed meaning:* the plan has no duration on sale, or no currency |
| 3007 | `INVALID_PLAN_TIER_SCOPE` | 400 | *Also:* a price set on an EVENT plan, or options on an ACCOUNT plan |

## 10. Checklist of breaking changes

| Where | Change |
|---|---|
| `POST /api/events` | `coverageOptionId` required (host) |
| `POST /api/checkout/preview-code` | `coverageOptionId` required |
| `POST /api/events/{id}/checkout/preview-code` | `targetCoverageOptionId` required with `targetPlanTierCode` |
| `GET /api/events/{id}/upgrade-options` | one entry per plan with `options[]`; entry-level `gapAmountMinor` / `payableAmountMinor` removed |
| `POST /api/events/{id}/upgrade-checkout` | `coverageOptionId` required |
| Plan responses (`/api/config`, `/api/plan-tiers`, admin) | `autoDeleteMonths` removed; `priceAmountMinor` always `null` on EVENT plans; `initialOptions` / `extensionOptions` added |
| Admin plan create/patch (`POST`/`PATCH /api/admin/plan-tiers`) | `autoDeleteMonths` is now a 400 (unknown field); `priceAmountMinor` on an EVENT plan is a 400 `INVALID_PLAN_TIER_SCOPE` |
| `GET /api/config` | `coverage.defaultHostingMonths` removed — the term is the option's `months` |

Additive: `PATCH /api/events/{id}` `coverageOptionId`; the billing view's new fields;
`PATCH /api/admin/events/{id}/plan-tier` `coverageOptionId`; the admin coverage-option endpoints.

## 11. Not yet: extensions (phase 2)

`extensionOptions` exists on every plan response and admins can add EXTENSION options now, but
there is no endpoint that sells one. Don't render an "Extend coverage" button yet. Phase 2 adds the
purchase, its refunds, and an "Extend coverage" action on the coverage-ending notification. This
guide will grow a section for it then.
