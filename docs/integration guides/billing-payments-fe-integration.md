# FE integration guide: paid events, checkout, and the frozen/purged lifecycle

> **Superseded — kept as change history.** Build against **`billing-fe-guide.md`**, which covers
> plans, quotas, modules, payments, subscriptions and refunds as one current reference. This file
> records what changed on 2026-08-06 and why, which the consolidated guide does not.

Covers the billing work shipped 2026-08-06. See `frontend-integration-guide.md` §0 for base setup
(auth header, error envelope) and `plan-tiers-fe-integration.md` for the plan catalog itself — this
doc only covers what payment adds on top. **Refunds, the new `429` rate limiting, and the refund
notifications shipped afterwards — see `refunds-rate-limits-fe-integration.md`.**

**The headline change: an event is not usable until it has been paid for.** `POST /api/events` now
returns a `DRAFT`, and only a completed payment turns it into an `ACTIVE` event. There is no free
plan — the cheapest plan is the default, not a free one.

---

## 1. The mental model

Two separate purchases, deliberately not one:

| purchase | what it buys | when |
|---|---|---|
| **Activation** (one-time) | the event goes live, plus storage until `endAt` + the plan's `includedMonths` | before the event |
| **Preservation** (monthly subscription) | keeps the photos online after that window runs out | months later, opt-in |

**Nothing is auto-charged between the two.** We hold no card on file after activation. When the
included window nears its end the host is emailed and has to start a *second* checkout by hand. This
is a product decision, not a limitation — no surprise charge six months after someone's wedding.

### Event status

```
DRAFT ──(activation paid)──► ACTIVE ──(unpaid + 14d dunning)──► FROZEN
                               ▲                                  │
                               └───(any payment restores it)──────┤
                                                                  │
                                             (frozen + 30d grace) ▼
                                                               PURGED
```

`status` is on both `EventResponseDto` and `EventDetailResponseDto`. What each means to the UI:

| status | reads | writes | guests | notes |
|---|---|---|---|---|
| `DRAFT` | hosts only | hosts only | **cannot join or be invited** | not in listings for anyone else |
| `ACTIVE` | yes | yes | yes | the normal state |
| `FROZEN` | **yes** | **no** — `409 EVENT_FROZEN` | can still log in and browse | read-only; still in listings |
| `PURGED` | yes, but the media is gone | no | can log in | files permanently deleted; rows remain |

Two things worth internalising:

- **A frozen event is not hidden.** Guests keep seeing the gallery, posts and stories. Only writes
  close. Freezing people out of a wedding album they were invited to would punish the wrong party.
- **`PURGED` is not recoverable.** The event, members, posts and RSVPs survive; the images do not.
  Paying again returns it to `ACTIVE` with nothing to restore. The UI should say so plainly before
  the purge, not after.

"Past due" is **not** a status. An event whose coverage has lapsed stays `ACTIVE` for the 14-day
dunning window and keeps working — you learn about it from notifications (§7), not from `status`.

---

## 2. The plan catalog and how to price it

`GET /api/config` → `planTiers: PlanTierResponseDto[]`, already filtered to
`isAssignable && isPublic`. **Filter to `scope === 'EVENT'`** for anything event-related;
`scope === 'ACCOUNT'` rows are the user's own plan and are priced separately.

The fields that matter for a pricing page:

```jsonc
{
  "code": "BASIC",
  "scope": "EVENT",
  "name": "Basic",
  "sortOrder": 0,
  "priceAmountMinor": 10000,          // one-time activation charge, in minor units (100.00 €)
  "priceCurrency": "EUR",             // uppercase ISO 4217
  "billingPeriod": "ONE_TIME",        // EVENT plans are always ONE_TIME for the activation price
  "recurringPriceAmountMinor": 1500,  // monthly preservation charge (15.00 €), same currency
  "includedMonths": 3,                // free months after endAt before the subscription is needed
  "storageBytes": 1073741824,
  "maxMembers": 20,
  "moduleKeys": ["gallery", "posts", "..."]
}
```

Rendering rules:

- **All amounts are minor units** (cents). Divide by 100 for EUR — do not assume 2 decimals for
  other currencies if you ever add one.
- **`recurringPriceAmountMinor` reuses `priceCurrency`.** There is no separate recurring currency
  field, by design: one plan bills in one currency.
- **The recurring period is always monthly.** There is no `recurringBillingPeriod` field. A yearly
  option, if it ever exists, will be a separate plan row.
- Suggested copy: *"€100 once, then €15/month after {includedMonths} months"*.
- `recurringPriceAmountMinor` and `includedMonths` are **null on `ACCOUNT`-scope plans**. The API
  rejects them there, so do not render them.
- Sort by `sortOrder`, not by price.
- Prices are admin-editable at runtime. Never hardcode them, and re-read `/api/config` rather than
  caching across sessions.

---

## 3. The activation flow, end to end

```
1. POST /api/events                      → 201, status: "DRAFT"
2. (host fills in details, incl. endAt)  → PATCH /api/events/{id}
3. POST /api/events/{id}/checkout        → 200 { orderId, redirectUrl }
4. window.location.href = redirectUrl    → Stripe's hosted page (we never see the card)
5. Stripe redirects back to
   /events/{id}/checkout/success|cancelled
6. Poll GET /api/events/{id} until status === "ACTIVE"
```

### Step 1 — creating the draft

`POST /api/events` is unchanged except that `planTierCode` is required and the result is a `DRAFT`.
Pass a `code` from the `EVENT`-scope catalog. A plan that is archived or not public →
`409 PLAN_TIER_NOT_PURCHASABLE`.

Drafts are the host's private workspace: they are excluded from `GET /api/events` for everybody
else, guests cannot be invited, and every module reports unavailable. Show them in a clearly
separate "unpaid / not published yet" section rather than mixed into the event list.

### Step 2 — `startAt` is required before checkout; `endAt` stays optional

`startAt` is required from creation onward. `endAt` stays optional even at checkout — this is a
one-time payment with no billing period tied to it, so there's nothing that needs an end date to be
priced. If an `endAt` is given, it still has to make sense:

- `startAt` missing → `400 EVENT_DATES_INCOMPLETE`
- `endAt <= startAt` → `400 EVENT_DATES_INCOMPLETE` (also enforced on `PATCH /api/events/{id}`)

Gate the "Pay and publish" button on `startAt` being set (and, if `endAt` is set, on it being after
`startAt`), and explain why — otherwise the 400 arrives at the worst possible moment.

### Step 3 — opening checkout

```http
POST /api/events/{eventId}/checkout
Authorization: Bearer <jwt>
```

**No request body at all.** The plan, price and currency come from rows on the server; there is
nothing here for a client to pass and therefore nothing to tamper with. Host-only.

```jsonc
// 200
{
  "orderId": "1f3c...",     // our order id — worth logging for support
  "redirectUrl": "https://checkout.stripe.com/c/pay/cs_test_..."
}
```

Then `window.location.href = redirectUrl`. Do not open it in an iframe or a popup — Stripe's hosted
page sets frame-ancestor headers, and 3DS/SCA flows need a real top-level navigation.

Calling it twice is safe: our order id is also the provider's idempotency key, so a retry returns
the same session rather than opening a second one. It is still worth disabling the button while the
request is in flight.

### Step 5 — the two return routes you must implement

The backend builds them from `app.billing.app-base-url` and they are **not configurable per
request**:

| route | meaning |
|---|---|
| `/events/{eventId}/checkout/success` | the host completed the hosted page |
| `/events/{eventId}/checkout/cancelled` | the host backed out |

Both need to exist in the FE router or the host lands on a 404 immediately after paying.

### Step 6 — success does *not* mean paid yet

**This is the single most important thing in this document.** Landing on `/checkout/success` means
the host finished the Stripe page. It does **not** mean we have been told about it. Activation
happens when the signed webhook arrives, which is usually a second or two later but is not
guaranteed and is not ordered relative to the redirect.

So the success page must be a *waiting* state, not a confirmation:

```ts
// on /events/:id/checkout/success
// Poll the billing endpoint (§9) and watch your own order, not the event status: it is the only
// signal that works for both purchases — a renewal never changes the event's status.
const settled = await pollUntil(
  () => api.get(`/api/events/${id}/billing`)
          .then(b => b.orders.find(o => o.id === orderId)?.status === 'PAID'),
  { intervalMs: 1500, timeoutMs: 30_000 }
);

if (!settled) {
  // Not a failure. Payments that arrive late are reconciled by a sweep within ~15 minutes.
  showPending("Payment received — we're finishing up. This page will update shortly.");
}
```

Never tell the host the payment failed on a timeout. If a webhook is lost entirely, a reconciliation
sweep asks Stripe directly and settles the order within about 15 minutes. The correct message is
"still processing", with a way back to the event.

If the host lands on `/checkout/cancelled`, the event is still a `DRAFT` and nothing was charged —
offer the checkout button again. Nothing needs cleaning up.

---

## 4. Error codes

The envelope is the usual RFC 7807 `ProblemDetail` with a numeric `errorCode` (see
`frontend-integration-guide.md` §0). New and newly reachable codes:

| code | HTTP | when | what to show |
|---|---|---|---|
| `3008` `EVENT_DATES_INCOMPLETE` | 400 | checkout with no `startAt`, or `endAt <= startAt` | "Set a start date before publishing" — send them to the schedule form |
| `5017` `EVENT_NOT_DRAFT` | 409 | checkout on an event that is already live/frozen/purged | usually a stale tab; refetch the event |
| `5015` `PLAN_TIER_NOT_PURCHASABLE` | 409 | the plan was archived or hidden since the page loaded | refetch `/api/config` and ask them to pick again |
| `5019` `PLAN_TIER_NOT_PRICED` | 409 | catalog misconfiguration — the plan has no price (activation or monthly) | generic error + support contact; the host cannot fix this |
| `5014` `EVENT_NOT_ACTIVE` | 409 | subscription checkout on an event that is still a `DRAFT` | send them to activation instead |
| `5020` `SUBSCRIPTION_ALREADY_ACTIVE` | 409 | subscription checkout on an event that already has a live one | show the existing subscription; refetch `/billing` |
| `5010` `ACTIVE_EVENT_LIMIT_EXCEEDED` | 409 | the account's plan caps active events | upsell the *account* plan — checkout is blocked until then |
| `5014` `EVENT_NOT_ACTIVE` | 409 | a guest/module action on a `DRAFT` | "This event hasn't been published yet" |
| `5016` `EVENT_FROZEN` | 409 | **any write** on a `FROZEN` or `PURGED` event | "This event is read-only until it's renewed" + link to the plan page |
| `5018` `ORDER_NOT_PENDING` | 409 | admin settling an order that already settled | admin panel only |
| `5026` `SUBSCRIPTION_NOT_LIVE` | 409 | cancelling on an event with no live subscription | stale tab; refetch `/billing` — it was probably already cancelled |
| `5027` `SUBSCRIPTION_CANCEL_FAILED` | 502 | the provider would not stop it just now | "Couldn't stop it just now — try again shortly." **Nothing changed and it is still billing**, so do not render it as cancelled |
| `3010` `RATE_LIMITED` | 429 | any endpoint, once the caller's budget for the window is spent | handle globally — see `refunds-rate-limits-fe-integration.md` §6 |

`403` on checkout means the caller is not a host. Co-hosts count as hosts.

### Handle `5016` globally

`EVENT_FROZEN` can come back from *every* write path — gallery upload, post, comment, reaction,
story, playlist, RSVP, member changes. It is a single server-side gate, so handle it once in your
API error interceptor (banner + refetch the event to pick up the new `status`) rather than at 20
call sites.

---

## 5. Frozen and purged UI

`GET /api/events/{id}` still returns everything, and **module availability flags stay `true`** on a
frozen event — modules are still *visible*, they are just not *writable*. Do not use the module
flags to decide whether to show a compose box; use `status`.

Recommended treatment:

- `status === 'FROZEN'` → persistent banner ("This event is read-only. Renew to add photos again"),
  hide/disable every compose, upload and RSVP control, keep all read surfaces exactly as they are.
- `status === 'PURGED'` → same, plus explicit copy that the photos and videos were deleted and
  cannot be restored. Expect broken/absent media — `coverMediaId` is nulled server-side when its
  file is purged, and other media references resolve to `null`.
- Guests should see a softer version of the same banner without the payment CTA — they cannot pay.

---

## 6. Dev and staging behave differently from production

The provider is configurable (`app.billing.provider`). Unless the environment is explicitly set to
`STRIPE`, it runs the **manual** provider, and the difference is visible to the FE:

| | `MANUAL` (default: dev, staging) | `STRIPE` (production) |
|---|---|---|
| `redirectUrl` | points straight back at `/events/{id}/checkout/success` | a real `checkout.stripe.com` URL |
| when the event activates | **only when an admin settles the order** | a second or two after the hosted page |

So on a dev environment the host "pays", lands on the success page, and the event stays `DRAFT`
until someone calls `POST /api/admin/orders/{orderId}/settle`. **That is not a bug** — it is why the
success page must be a polling/pending state and not an assertion that the payment worked. Keep the
`orderId` visible in dev builds so testers can settle their own orders.

---

## 7. Dunning notifications

Three rules fire through the existing notification + email pipeline. They appear in the normal
notification feed with `category: "BILLING"` and are only sent to **hosts**.

| `type` | severity | fires at | payload |
|---|---|---|---|
| `BILLING_EXPIRING` | `WARNING` | 30 / 14 / 7 / 1 days before coverage ends | `paidThrough`, `daysRemaining`, `planTier` |
| `BILLING_PAST_DUE` | `CRITICAL` | 0 / 3 / 7 days after it lapsed | `paidThrough`, `daysOverdue`, `daysUntilFreeze`, `planTier` |
| `BILLING_PURGE_WARNING` | `CRITICAL` | 14 / 7 / 1 days before the media is deleted | `purgesAt`, `daysRemaining`, `storedBytes`, `planTier` |

All three carry `ctaRoute: "/events/{eventId}/settings/plan"`, so **that route has to exist** — it
is the destination of every dunning email and in-app CTA. Only the most urgent crossed threshold
fires, so a host gets roughly four messages across a 45-day arc, not forty-five.

`daysUntilFreeze` and `daysRemaining` are precomputed server-side — render them directly rather than
recomputing from `paidThrough`, so the copy matches the email the host already received.

Add `BILLING` to any notification-category filter UI, and `BILLING_EXPIRING` /
`BILLING_PAST_DUE` / `BILLING_PURGE_WARNING` to the `NotificationType` union in
`frontend-api-types.ts`.

---

## 8. Types to add

```ts
// POST /api/events/{eventId}/checkout
export interface CheckoutResponseDto {
  orderId: string;      // UUID
  redirectUrl: string;
}

export type EventStatus = 'DRAFT' | 'ACTIVE' | 'FROZEN' | 'PURGED';

// GET /api/events/{eventId}/billing
export interface EventBillingResponseDto {
  eventStatus: EventStatus;
  planTierCode: string;
  planTierName: string;
  coverage: CoverageSummary;
  subscription: SubscriptionSummary | null;
  orders: OrderSummary[];          // newest first
}

export interface CoverageSummary {
  unlimited: boolean;              // grandfathered: never expires
  paidThrough: string | null;      // null iff unlimited
  covered: boolean;
  freezesAt: string | null;        // null iff unlimited
  purgesAt: string | null;         // null iff unlimited
}

export interface SubscriptionSummary {
  id: string;
  status: 'ACTIVE' | 'PAST_DUE' | 'CANCELLED';
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;      // cancelled, but the paid month is still running
  cancelledAt: string | null;
}

export interface OrderSummary {
  id: string;
  kind: 'ACTIVATION' | 'RENEWAL';
  status: 'PENDING' | 'PAID' | 'FAILED' | 'CANCELLED';
  amountMinor: number;
  currency: string;
  coversFrom: string | null;
  coversUntil: string | null;
  paidAt: string | null;
  createdAt: string;
}

// PlanTierResponseDto — two new fields, both null on ACCOUNT scope
export interface PlanTierResponseDto {
  // ...existing fields...
  recurringPriceAmountMinor: number | null;
  includedMonths: number | null;
}
```

`EventResponseDto.status` and `EventDetailResponseDto.status` widen from `'DRAFT' | 'ACTIVE'` to the
four-value union above — that is a **breaking type change** for any exhaustive `switch`.

---

## 9. Renewal, and the billing read endpoint

These two are what the plan-settings page (`/events/{id}/settings/plan`, where every dunning CTA
points) is built from.

### `GET /api/events/{eventId}/billing` — host only

One read, everything about the event's money. Also the correct polling target after any checkout.

```jsonc
// 200
{
  "eventStatus": "ACTIVE",
  "planTierCode": "EVENT_STANDARD",
  "planTierName": "Standard",
  "coverage": {
    "unlimited": false,        // true = created before billing existed; never expires, never freezes
    "paidThrough": "2026-09-12T00:00:00Z",
    "covered": true,           // does coverage reach right now
    "freezesAt": "2026-09-26T00:00:00Z",   // null when unlimited
    "purgesAt":  "2026-10-26T00:00:00Z"    // null when unlimited
  },
  "subscription": {            // null when there is no live subscription
    "id": "…", "status": "ACTIVE", "currentPeriodEnd": "2026-09-12T00:00:00Z",
    "cancelAtPeriodEnd": false, "cancelledAt": null
  },
  "orders": [                  // newest first; every order ever placed on this event
    { "id": "…", "kind": "ACTIVATION", "status": "PAID", "amountMinor": 4900, "currency": "EUR",
      "coversFrom": "…", "coversUntil": "…", "paidAt": "…", "createdAt": "…" }
  ]
}
```

`unlimited: true` must render as "included, no renewal needed" — **not** as a missing date and never
with a freeze warning. `freezesAt` and `purgesAt` are computed, not stored, and they move whenever a
payment lands, so re-read after any settlement rather than caching them.

No provider session or payment ids are returned. If support needs them, that is an admin question.

### `POST /api/events/{eventId}/subscription-checkout` — host only

The second purchase: the flat monthly fee that keeps the media alive past the included window. Same
shape as activation — no request body, returns `{ orderId, redirectUrl }`, same two return routes.

Differences from activation, all of which matter to the UI:

- Valid on `ACTIVE`, `FROZEN` **and** `PURGED` events; rejected on a `DRAFT` with `5014`. Paying
  after the freeze is the whole point, so keep the button visible on a frozen event.
- Priced from `recurringPriceAmountMinor`, billed monthly. `5019` if the plan has no monthly price.
- `5020 SUBSCRIPTION_ALREADY_ACTIVE` if a live subscription already exists — show the existing
  subscription from the billing endpoint instead of a second checkout button.
- The event's status does not change when it settles, so poll the **order**, per §3 step 6. On a
  frozen event the status does change back to `ACTIVE`, but only on the next sweep run — do not make
  the success screen wait for it.

### `DELETE /api/events/{eventId}/subscription` — host only

Stops the monthly fee renewing. No request body; returns the updated `SubscriptionSummary`.

```jsonc
// 200
{ "id": "…", "status": "ACTIVE", "currentPeriodEnd": "2026-09-12T00:00:00Z",
  "cancelAtPeriodEnd": true, "cancelledAt": null }
```

**It takes effect at the end of the period already paid for, not immediately.** That is why the
response still says `ACTIVE` with a future `currentPeriodEnd` — the host bought that month and keeps
it. Render it as *"Renews no more. Your event stays live until 12 Sep, then freezes."*, never as
"cancelled" with the event already gone; the status only becomes `CANCELLED` when the provider ends
it at the boundary and tells us, which the billing endpoint will show on a later read.

- Idempotent. Pressing it twice returns the same body and charges nothing — a host re-checking is
  not a second instruction.
- `409 5026` when there is no live subscription. `502 5027` when the provider refused: **nothing
  changed and the card is still being charged**, so keep the cancel button and say to try again.
- Rate limited to 10/hour per caller.
- There is no "resume". Undoing it means a new `subscription-checkout`, which creates a fresh
  subscription — so confirm before calling, and use the period end in the confirmation copy.
- Deleting the event cancels its subscription too, immediately and with no separate call. You never
  need to cancel first.

---

## 10. Admin panel endpoints

All `ROLE_ADMIN`, all under `/api/admin`:

| endpoint | effect |
|---|---|
| `POST /orders/{orderId}/settle` | marks an order paid without a provider payment — bank transfer, comped event, or a lost webhook. Activates the event exactly as a real payment would. |
| `POST /events/{id}/freeze` | forces an event read-only. Temporary, for testing the frozen state before the sweep is enabled everywhere. |
| `POST /events/{id}/purge` | **destroys the event's media in storage. Irreversible.** Returns `false` if some files could not be deleted (the event stays `FROZEN` and a later call retries). Needs a confirmation dialog that names the event. |
| `PATCH /events/{id}/plan-tier` | moves an event between plans; returns the event's usage so an admin sees immediately whether the new limits are already exceeded. |
| `PATCH /admin/plan-tiers/{id}` | edits prices, including `recurringPriceAmountMinor` and `includedMonths`. |
| `GET /refund-requests`, `POST /refund-requests/{id}/approve` `/reject` | the refund queue and its decisions — documented in `refunds-rate-limits-fe-integration.md` §3. |

---

## 11. Not built yet — do not design against these

- **Resuming a cancelled subscription.** Cancelling is one-way (§9). Undoing it means opening a new
  `subscription-checkout`, so there is no "keep my subscription" button to build against a
  `cancelAtPeriodEnd: true` row — only a fresh purchase.
- **Invoices and receipts.** `orders` carries what was charged and when, and nothing else. There is
  no PDF, no invoice number, and no billing address — the provider's own emails are the receipt.
- **Changing an event's plan as a host.** Only admins can move an event between plans
  (§10). A host-facing upgrade/downgrade flow does not exist.

Say so if the plan page needs any of these — they are additions, not oversights.
