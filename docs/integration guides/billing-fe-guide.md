# FE integration guide: plans, payments, subscriptions, refunds

**The complete, current reference for the commercial side of the platform.** Everything a frontend
needs to sell an event, keep it alive, and give money back. Current as of 2026-08-24.

**2026-08-24:** The account-level active-event cap is gone, not just disabled — `maxActiveEvents`,
`GET /api/me/usage`, error `5010 ACTIVE_EVENT_LIMIT_EXCEEDED`, and the `EVENT_CAP_WARNING`
notification have been deleted outright, for every account plan including `PLUS`/`PRO` (§1, §2, §3,
§12–§14, §16). This doc is updated in place; **`account-event-quota-removed-fe-integration.md` has
the focused delta.** Event-level quotas (storage/members, `5008`/`5009`,
`GET /api/events/{id}/usage`) are unaffected.

**2026-08-21:** `EVENT`-scope plans can now be restricted to specific event types, and there is a new
endpoint to read the restricted catalog: `GET /api/plan-tiers?eventType=X` (§2). This is what makes
"same display name, different code, different price/addons per event type" possible — see §2 for the
full field and endpoint reference. `POST /api/events` enforces the restriction server-side even for a
stale client (§6, `409 PLAN_TIER_NOT_AVAILABLE_FOR_EVENT_TYPE`, 5053), and there's a matching admin
endpoint to set it (§13). `paidModules` (§2, §4) is no longer exclusive to `GET /api/config` — the new
endpoint populates it the same way, so a type-scoped plan picker can render module upsells without a
second fetch of the full catalog. **`plan-tiers-by-event-type-fe-integration.md` has the focused
delta.**

**2026-08-17:** A `MODULE_UNLOCK` (§7c) can now be priced `billingPeriod: 'ONE_TIME'` — charged once
on the activation and never on a renewal. So `billingPeriod` is a value to read again rather than a
constant, `AddonSummary` carries it (§8), and it stops being patchable once events hold the service
(§13). This doc is updated in place; **`one-time-module-unlocks-fe-integration.md` has the focused
delta**, and is worth reading if you followed `storage-packs-recurring-fe-changes.md`'s advice to
delete your `billingPeriod` branching.

**2026-08-16:** A third `PaidServiceKind`, `MODULE_UNLOCK` (§7c), sells a single module to a single
event whose plan doesn't include it — so a module's availability is no longer decided by the plan
alone. §4 and §13's catalog validation are updated accordingly, and there is a new host endpoint,
`POST /api/events/{eventId}/addons`. Two new modules also exist (`wishlist`, `wishbook`); see
`wishlist-wishbook-cohost-fe-integration.md` for what they do.

**2026-08-14:** Storage packs (§7b) are no longer one-time — a settled pack now folds into the
recurring subscription the same way the "keep originals" add-on already does, and admin entitlement
removal is refused outright on any `ACTIVE` event (new `409 ADDON_LOCKED_WHILE_ACTIVE`, 5042). This
doc is updated in place; **`storage-packs-recurring-fe-changes.md` has the focused delta** if you've
already built against the previous version.

**2026-08-13:** Two new purchases, both against a new admin-managed `paid_services` catalog: the
"keep originals" recurring add-on (§7a) and storage packs (§7b). `GET /api/admin/metrics`
also gained a `storage` block — see `account-plans-disabled-and-platform-metrics-fe-integration.md`.

**2026-08-11:** Account-scope plans (`scope: 'ACCOUNT'`) are disabled — see
`account-plans-disabled-and-platform-metrics-fe-integration.md` for the full change and a new
`GET /api/admin/metrics` endpoint. This doc's `ACCOUNT`-scope references below have been updated
in place; the standalone doc has the "what changed and why" detail.

This supersedes three earlier delta docs, which remain in `docs/` as change history only:
`plan-tiers-fe-integration.md`, `billing-payments-fe-integration.md`,
`refunds-rate-limits-fe-integration.md`. **Build against this one.**

Assumes `frontend-integration-guide.md` §0 for base setup (auth header, the RFC 7807 error envelope)
and `app-config-fe-integration.md` for the rest of `GET /api/config`.

---

## Contents

1. [The commercial model in one page](#1-the-commercial-model-in-one-page)
2. [The plan catalog](#2-the-plan-catalog)
3. [Quotas and how they fail](#3-quotas-and-how-they-fail)
4. [Modules](#4-modules)
5. [The event lifecycle](#5-the-event-lifecycle)
6. [Activation: the first purchase](#6-activation-the-first-purchase)
7. [Preservation: the subscription](#7-preservation-the-subscription)
7a. [The "keep originals" add-on](#7a-the-keep-originals-add-on)
7b. [Storage packs](#7b-storage-packs)
7c. [Module unlocks](#7c-module-unlocks)
8. [The billing read endpoint](#8-the-billing-read-endpoint)
9. [Refunds](#9-refunds)
10. [Notifications](#10-notifications)
11. [Rate limiting and the 429](#11-rate-limiting-and-the-429)
12. [Error codes, all of them](#12-error-codes-all-of-them)
13. [Admin endpoints](#13-admin-endpoints)
14. [TypeScript types](#14-typescript-types)
15. [Dev and staging behave differently](#15-dev-and-staging-behave-differently)
16. [Screens to build](#16-screens-to-build)
17. [Not built — do not design against these](#17-not-built--do-not-design-against-these)

---

## 1. The commercial model in one page

**An event is not usable until it has been paid for.** `POST /api/events` returns a `DRAFT`, and only
a completed payment turns it into an `ACTIVE` event. There is no free plan — the cheapest plan is the
default, not a free one.

Two separate purchases, deliberately not one:

| purchase | what it buys | when |
|---|---|---|
| **Activation** (one-time) | the event goes live, plus storage until `endAt` + the plan's `includedMonths` | before the event |
| **Preservation** (monthly subscription) | keeps the photos online after that window runs out | months later, opt-in |

**Nothing is auto-charged between the two.** No card is held on file after activation. When the
included window nears its end the host is emailed and has to start a *second* checkout by hand. That
is a product decision, not a limitation — no surprise charge six months after someone's wedding.

Two independent plan scopes, and confusing them is the most common integration mistake:

| scope | assigned to | governs | meaningful fields |
|---|---|---|---|
| `EVENT` | a single event | that event's storage and guest count | `storageBytes`, `maxMembers`, `moduleKeys` |
| `ACCOUNT` | a user | nothing — no quota is read from an account's plan anymore | *(none)* |

An `EVENT` plan can never be assigned to a user and vice versa. `ACCOUNT`-scope plans still exist
(every user still has one) but grant no quota and cannot be created or reassigned — see §13,
Assignment.

And the refund path, which only ever runs backwards through activation:

```
host requests ──► admin decides ──► approved: money back + event returns to DRAFT
                                └─► rejected: nothing changes
```

---

## 2. The plan catalog

`GET /api/config` → `planTiers: PlanTierResponse[]`, already filtered to `isAssignable && isPublic`.
This is the public, marketing-facing catalog. Admins see the full one at
`GET /api/admin/plan-tiers` (§13).

**`ACCOUNT`-scope plans no longer appear in this array** — they are all `isPublic: false` now that
account plans are disabled (§13, Assignment). Filter a pricing page by `scope === 'EVENT'`; an
"account plans" tab built by filtering the other way will render empty.

```jsonc
{
  "id": "b1e2c3d4-…",
  "code": "BASIC",
  "scope": "EVENT",
  "name": "Basic",
  "description": "For a small party",
  "sortOrder": 0,
  "isDefault": true,
  "isAssignable": true,
  "isPublic": true,

  "storageBytes": 1073741824,
  "maxMembers": 20,

  "priceAmountMinor": 10000,          // one-time activation charge — 100.00 EUR
  "priceCurrency": "EUR",             // uppercase ISO 4217
  "billingPeriod": "ONE_TIME",
  "recurringPriceAmountMinor": 1500,  // monthly preservation charge — 15.00 EUR, same currency
  "includedMonths": 3,                // free months after endAt before the subscription is needed

  "discountPercent": null,
  "discountLabel": null,
  "discountStartsAt": null,
  "discountEndsAt": null,

  "moduleKeys": ["gallery", "posts", "rsvp"],
  "eventTypeKeys": [],           // empty = purchasable for every event type — see below
  "paidModules": []              // MODULE_UNLOCK upsells for this plan — see §4
}
```

### Rendering rules

- **All amounts are minor units** (cents). Divide by 100 for EUR — do not hardcode two decimals if
  you ever add a currency that does not use them.
- **`recurringPriceAmountMinor` reuses `priceCurrency`.** There is no separate recurring currency
  field, by design: one plan bills in one currency.
- **The recurring period is always monthly.** There is no `recurringBillingPeriod`. A yearly option,
  if it ever exists, will be a separate plan row.
- Suggested copy: *"€100 once, then €15/month after 3 months"*.
- `recurringPriceAmountMinor` and `includedMonths` are **null on `ACCOUNT`-scope plans**. The API
  rejects them there, so do not render them.
- `storageBytes`/`maxMembers` are always null on `ACCOUNT` plans — there is nothing left to render
  for an account plan's row beyond its price. Hide the quota columns entirely rather than showing
  "0" or "Unlimited" for a scope that grants none.
- Sort by `sortOrder`, not by price.
- Prices are admin-editable at runtime. **Never hardcode them**, and re-read `/api/config` rather
  than caching across sessions.

### `null` means no limit — the most likely rendering bug

`storageBytes` and `maxMembers` are both `number | null`. `null` means **no limit
is enforced**. It must render as "Unlimited", never as "0 bytes" or an empty progress bar, and it has
no denominator so it cannot drive a percentage.

```ts
// Wrong — formatBytes(null) throws or prints "NaN MB"
`${formatBytes(plan.storageBytes)} storage`

// Right
plan.storageBytes === null ? 'Unlimited storage' : `${formatBytes(plan.storageBytes)} storage`
```

An uncapped enterprise plan is a real, intended shape — not missing data.

### `code` is not a fixed union

Admins create plans at runtime, so `code` is **not** limited to `'FREE' | 'PLUS' | 'PRO'`. Any
`type PlanTier = …` union, exhaustive switch, or hardcoded array of tier names must widen to `string`
and read the actual set from `planTiers`. `code` is unique **per scope**, not globally — an `EVENT`
plan and an `ACCOUNT` plan can both legitimately be called `FREE`.

`GET /api/events/{id}/usage` returns `planTier` as a plain string for the same reason. The wire
value never changed; only the declared type widened.

### `eventTypeKeys` — the same display name, different plan per event type

This is how "Basic" can mean something different — different price, different `moduleKeys`, a
different set of `paidModules` — for a birthday than for a wedding, without any per-code repricing
mechanism: they are simply two different `PlanTier` rows that happen to share a `name`. Nothing
enforces uniqueness on `name`, only on `code` (and only per scope, per §2's "`code` is not a fixed
union" above).

- **Empty array** (the default every plan seeds with) means the plan is purchasable for **every**
  event type. This is `eventTypeKeys: []`, not `null` — check length, not nullness.
- **Non-empty** restricts the plan to those event types, both in the endpoint below and as a
  server-enforced check at event creation (§6).
- Always empty on `ACCOUNT`-scope plans — the restriction only makes sense per-event.

### New: `GET /api/plan-tiers?eventType=WEDDING`

Authenticated (any logged-in user — not `permitAll`, unlike `GET /api/config` which is public).
Returns the `EVENT`-scope, assignable, public plans available for `eventType`: every plan with an
empty `eventTypeKeys`, plus every plan whose `eventTypeKeys` contains it. Same `PlanTierResponseDto`
shape as `GET /api/config`'s `planTiers`, `paidModules` included.

```
GET /api/plan-tiers?eventType=WEDDING
→ 200
[
  { "code": "BASIC", "scope": "EVENT", "eventTypeKeys": [], "moduleKeys": [...], "paidModules": [...] },
  { "code": "WEDDING_PLUS", "scope": "EVENT", "eventTypeKeys": ["WEDDING"], "moduleKeys": [...], "paidModules": [...] }
]
```

An unknown `eventType` → `400` / `errorCode: 3018 INVALID_EVENT_TYPE` — the same error and same set
of valid keys as event creation uses (`GET /api/config`'s `eventTypeKeys` array is the source of
truth for what's valid).

**Use this for the plan-picker step of event creation, once the host has already chosen a type.** It
is a strict subset of the full catalog — every plan it returns also appears in `GET /api/config`,
just possibly filtered out there if it's restricted to other types. Building a birthday-only catalog
or a wedding-only catalog is then just: give the birthday plan and the wedding plan the same `name`
("Basic"), different `code`s, different prices/`moduleKeys`, and set `eventTypeKeys` on each (or leave
the birthday one unrestricted if there's only ever going to be one birthday plan). The FE never needs
to know two rows share a display name — it just renders whatever this endpoint returns for the
selected type.

---

## 3. Quotas and how they fail

Plan limits are enforced at write time. Flows that used to always succeed can return `409`.

| code | name | returned from |
|---|---|---|
| `5008` | `EVENT_STORAGE_LIMIT_EXCEEDED` | `POST /api/events/{id}/media`, `.../media/batch` (per file) |
| `5009` | `EVENT_MEMBER_LIMIT_EXCEEDED` | `POST /api/events/{id}/members`, invite acceptance |

Every rejection carries a `details` object so you can render an upgrade prompt without a second
round-trip:

```jsonc
{
  "status": 409,
  "errorCode": 5008,
  "errorKey": "EVENT_STORAGE_LIMIT_EXCEEDED",
  "detail": "This event has no room left for new media on its current plan.",
  "details": {
    "planCode": "FREE",
    "used": 2147480000,
    "limit": 2147483648,
    "incomingBytes": 10485760      // storage rejections only
  }
}
```

`used` / `limit` are member counts for `5009` (bytes for `5008`, shown above).

**Batch uploads are partial.** `POST /api/events/{id}/media/batch` still returns `200`; files that
would overflow appear in `failed` with `errorCode: "EVENT_STORAGE_LIMIT_EXCEEDED"`, files that fit
appear in `created`. A quota-full event does not fail the whole batch.

**Null limits never reject.** No cap, no check, no progress bar.

**There is no account-level quota any more.** `POST /api/events` cannot reject for "too many active
events" — that cap (`5010 ACTIVE_EVENT_LIMIT_EXCEEDED`) and the account-level usage endpoint it
came from were removed 2026-08-24; see
`account-event-quota-removed-fe-integration.md`. Everything on this page is event-scoped.

### Usage endpoints

```
GET /api/events/{eventId}/usage   → EventUsageResponse    (storage + members, host only)
```

The `*Percent` fields are precomputed server-side. Render them directly.

---

## 4. Modules

A module (`posts`, `rsvp`, `playlist`, `stories`, `gallery`, and as of 2026-08-16 `wishlist` and
`wishbook`) is gated by three independent switches, ANDed together:

1. **The registry's `isEnabled`** — a platform-wide kill switch (admin, §13).
2. **The event has paid for it** — either the plan's `moduleKeys` lists it, **or** the event holds a
   `MODULE_UNLOCK` entitlement for it (§7c). This one is an OR of two routes, not two gates.
3. **The event module's own `isEnabled`** — the per-event toggle in event settings.

`EventModuleResponse.isAvailable` is the AND of all three. **Gate UI on `isAvailable`, never on
`isEnabled`** — a module can be enabled for the event and still unavailable because the plan excludes
it or the registry has it off platform-wide.

An unlock is a commercial answer, not an override: it satisfies gate 2 only. A module withdrawn
platform-wide at gate 1 stays dark for events that paid for it.

`eventModuleKeys` on `GET /api/config` reflects the registry: a module disabled there disappears
entirely, platform-wide, regardless of plan, unlock, or per-event setting.

`moduleKeys` on a plan is what upgrading onto that plan *would* grant — the data behind "upgrade to
unlock Stories" messaging on a disabled module. Always empty for `ACCOUNT`-scope plans. Since
2026-08-16 that is not the only sales pitch available for a locked module: check `paidServices` for
a `MODULE_UNLOCK` whose `grantsModuleKey` matches, and offer that instead where it exists — it is
usually the cheaper answer for the host, and it is the only one on an event whose plan is already
the top tier.

---

## 5. The event lifecycle

```
DRAFT ──(activation paid)──► ACTIVE ──(unpaid + 14d dunning)──► FROZEN
                               ▲                                  │
                               └───(any payment restores it)──────┤
                               ▲                                  │
                     (refund approved)            (frozen + 30d) ▼
                               │                               PURGED
                            DRAFT
```

`status` is on both `EventResponse` and `EventDetailResponse`.

| status | reads | writes | guests | notes |
|---|---|---|---|---|
| `DRAFT` | hosts only | hosts only | **cannot join or be invited** | not in listings for anyone else |
| `ACTIVE` | yes | yes | yes | the normal state |
| `FROZEN` | **yes** | **no** — `409 EVENT_FROZEN` | can still log in and browse | read-only; still in listings |
| `PURGED` | yes, but the media is gone | no | can log in | files permanently deleted; rows remain |

Three things worth internalising:

- **A frozen event is not hidden.** Guests keep seeing the gallery, posts and stories. Only writes
  close. Freezing people out of a wedding album they were invited to would punish the wrong party.
- **`PURGED` is not recoverable.** The event, members, posts and RSVPs survive; the images do not.
  Paying again returns it to `ACTIVE` with nothing to restore. Say so plainly *before* the purge.
- **An approved refund returns an `ACTIVE` event to `DRAFT`** — the one backwards transition that is
  not about non-payment. See §9.

**"Past due" is not a status.** An event whose coverage has lapsed stays `ACTIVE` for the 14-day
dunning window and keeps working. You learn about it from notifications (§10), not from `status`.

### Frozen and purged UI

`GET /api/events/{id}` still returns everything, and **module availability flags stay `true`** on a
frozen event — modules are still *visible*, just not *writable*. Do not use module flags to decide
whether to show a compose box; use `status`.

- `FROZEN` → persistent banner ("This event is read-only. Renew to add photos again"), disable every
  compose/upload/RSVP control, leave all read surfaces exactly as they are.
- `PURGED` → same, plus explicit copy that the media was deleted and cannot be restored. Expect
  absent media: `coverMediaId` is nulled server-side when its file is purged and other media
  references resolve to `null`.
- Guests get a softer version of the same banner **without the payment CTA** — they cannot pay.

---

## 6. Activation: the first purchase

```
1. POST /api/events                      → 201, status: "DRAFT"
2. host fills in details, incl. endAt    → PATCH /api/events/{id}
3. POST /api/events/{id}/checkout        → 200 { orderId, redirectUrl }
4. window.location.href = redirectUrl    → the provider's hosted page (we never see the card)
5. provider redirects back to
   /events/{id}/checkout/success|cancelled
6. poll GET /api/events/{id}/billing until the order is PAID
```

### Step 1 — creating the draft

`planTierCode` is required on `POST /api/events` and must be a `code` from the `EVENT`-scope catalog.
An archived or non-public plan → `409 PLAN_TIER_NOT_PURCHASABLE`. A plan whose `eventTypeKeys` (§2) has
restricted it away from the request's `eventType` → `409 PLAN_TIER_NOT_AVAILABLE_FOR_EVENT_TYPE`
(5053) — this is a server-side backstop for a stale client, not the primary UX; source the plan list
from `GET /api/plan-tiers?eventType=X` (§2) so a restricted plan is never offered for the wrong type
in the first place.

Drafts are the host's private workspace: excluded from `GET /api/events` for everybody else, guests
cannot be invited, every module reports unavailable. Show them in a clearly separate "not published
yet" section rather than mixed into the event list.

### Step 2 — `endAt` is required at checkout, not at creation

The one piece of validation in an unusual place. `endAt` is optional at creation (a draft exists so
details can arrive gradually) but **mandatory at checkout**, because paid coverage is measured from
it. Both of these are rejected with `400 EVENT_DATES_INCOMPLETE`:

- `endAt` missing
- `endAt <= startAt` (also enforced on `PATCH /api/events/{id}`)

Gate the "Pay and publish" button on `endAt` being set and after `startAt`, and explain why —
otherwise the 400 arrives at the worst possible moment.

### Step 3 — opening checkout

```http
POST /api/events/{eventId}/checkout
Authorization: Bearer <jwt>
```

**No request body at all.** The plan, price and currency come from rows on the server; there is
nothing for a client to pass and therefore nothing to tamper with. Host-only (co-hosts count; `403`
otherwise). Rate limited to 10/min.

```jsonc
// 200
{
  "orderId": "1f3c…",     // our order id — worth logging for support
  "redirectUrl": "https://checkout.stripe.com/c/pay/cs_test_…"
}
```

Then `window.location.href = redirectUrl`. **Do not open it in an iframe or a popup** — the hosted
page sets frame-ancestor headers, and 3DS/SCA needs a real top-level navigation.

Calling it twice is safe: our order id is also the provider's idempotency key, so a retry returns the
same session rather than opening a second one. Still disable the button while the request is in
flight.

**Tax and consent are not handled by this platform today — flag before launch, not FE work by
itself.** Automatic VAT/sales tax (Stripe Tax) is off by default (`BillingProperties.automaticTax`);
switching it on is a backend + Stripe-account config change (jurisdictions must be registered on the
Stripe account first), not something the FE can turn on. Turning it on also makes Stripe collect a
billing address on the hosted page, which changes that page's shape but not anything the FE calls.
Separately, the app records no explicit consent/ToS acceptance of its own before opening a recurring
checkout — only whatever Stripe's hosted page itself shows. If either becomes a compliance
requirement for the markets you launch into, it needs a product decision and backend work before FE
has anything to build against; this note exists so it isn't discovered at launch.

### Step 4 — the two return routes you must implement

Built server-side from `app.billing.app-base-url` and **not configurable per request**:

| route | meaning |
|---|---|
| `/events/{eventId}/checkout/success` | the host completed the hosted page |
| `/events/{eventId}/checkout/cancelled` | the host backed out |

Both must exist in the FE router or the host lands on a 404 immediately after paying.

### Step 5 — success does *not* mean paid

**The single most important thing in this document.** Landing on `/checkout/success` means the host
finished the provider's page. It does **not** mean we have been told about it. Activation happens
when the signed webhook arrives — usually a second or two later, but not guaranteed and not ordered
relative to the redirect.

So the success page is a *waiting* state, not a confirmation:

```ts
// on /events/:id/checkout/success
// Poll the billing endpoint and watch your own order, not the event status: the order is the only
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

**Never tell the host the payment failed on a timeout.** If a webhook is lost entirely, a
reconciliation sweep asks the provider directly and settles the order within about 15 minutes. The
correct message is "still processing", with a way back to the event.

On `/checkout/cancelled` the event is still a `DRAFT` and nothing was charged — offer the button
again. Nothing needs cleaning up.

---

## 7. Preservation: the subscription

```http
POST /api/events/{eventId}/subscription-checkout
```

The second purchase: the flat monthly fee that keeps the media alive past the included window. Same
shape as activation — no request body, returns `{ orderId, redirectUrl }`, same two return routes,
same 10/min limit.

Differences from activation, all of which matter to the UI:

- **Valid on `ACTIVE`, `FROZEN` and `PURGED` events**; rejected on a `DRAFT` with `5014`. Paying
  after the freeze is the whole point — keep the button visible on a frozen event.
- Priced from `recurringPriceAmountMinor`, billed monthly. `5019` if the plan has no monthly price.
- `5020 SUBSCRIPTION_ALREADY_ACTIVE` if a live subscription exists — show the existing subscription
  from the billing endpoint instead of a second checkout button.
- **The event's status does not change when it settles**, so poll the order per §6 step 5. On a
  frozen event the status *does* eventually return to `ACTIVE`, but only on the next sweep run — do
  not make the success screen wait for it.

### Stopping it

```http
DELETE /api/events/{eventId}/subscription
```

Host only, no request body, returns the updated `SubscriptionSummary`. 10/hour.

**It takes effect at the end of the period already paid for, not immediately** — the host bought
that month and keeps it. So the response still reads `ACTIVE` with a future `currentPeriodEnd` and
`cancelAtPeriodEnd: true`:

```jsonc
// 200
{ "id": "…", "status": "ACTIVE", "currentPeriodEnd": "2026-09-12T00:00:00Z",
  "cancelAtPeriodEnd": true, "cancelledAt": null }
```

Render that as *"Renews no more. Your event stays live until 12 Sep, then freezes."* — never as
"cancelled" with the event already gone. `status` becomes `CANCELLED` only when the provider ends it
at the boundary and tells us, which a later read of the billing endpoint picks up.

- Idempotent. Pressing it twice returns the same body and charges nothing.
- `409 5026 SUBSCRIPTION_NOT_LIVE` when there is nothing live to cancel — a stale tab; refetch.
- `502 5027 SUBSCRIPTION_CANCEL_FAILED` when the provider refused. **Nothing changed and the card is
  still being charged**: keep the button, say to try again shortly, do not show it as cancelled.
- One-way. Undoing it means a new `subscription-checkout` and a new subscription, so confirm first
  and put the period end in the confirmation copy.
- Deleting the event cancels its subscription too, immediately and with no separate call.

---

## 7a. The "keep originals" add-on

Every plan already gets a compressed, normalized display copy of every photo — that never changes.
The add-on stores the untouched original **alongside** it, for hosts who want the full-resolution
file preserved. It costs storage: an add-on event holds derivative + original, so it reaches its
quota sooner than the same event without it.

**Catalog code:** `ORIGINALS`, kind `RECURRING_ADDON`, from the paid-services catalog —

```
GET /api/config → paidServices: PaidServiceResponse[]   // filtered to isPublic && isAssignable
```

```jsonc
{
  "id": "…",
  "code": "ORIGINALS",
  "kind": "RECURRING_ADDON",
  "name": "Keep Originals",
  "description": "Keeps the original, full-resolution file for every photo alongside the compressed feed copy.",
  "sortOrder": 0,
  "priceAmountMinor": 500,        // 5.00 EUR, monthly, once billing starts (see below)
  "priceCurrency": "EUR",
  "billingPeriod": "MONTHLY",
  "grantsStorageBytes": null      // always null for a RECURRING_ADDON
}
```

### Opting in — `DRAFT` only

```http
PATCH /api/events/{id}
{ "keepOriginals": true }
```

**Only `true` is meaningful — there is no un-opting, and only while the event is `DRAFT`.** Opting
in later → `409 EVENT_NOT_DRAFT` (5017). This is deliberate: an event never has a mix of
pre-add-on and post-add-on photos. Show the toggle on the same screen as the plan picker, before
the "Pay and publish" button — not as a settings-page option on a live event. Opting in twice →
`409 ADDON_ALREADY_ACTIVE` (5038).

There is no separate add-on checkout. Entitlement is the row created by the `PATCH` above; the price
folds into whichever purchase happens next.

### Getting back out — admin only

```http
DELETE /api/admin/events/{eventId}/addons/{paidServiceCode}
```

**There is no host-facing way to remove an add-on**, and — since a recent change — no admin-facing
way either, once the event is `ACTIVE`. Once paid for, an entitlement (this add-on or a §7b storage
pack, same endpoint, same rule) is permanent for the life of the event: `409
ADDON_LOCKED_WHILE_ACTIVE` (5042). The only way it lapses is the event itself lapsing through the
freeze/purge sweep, which deletes everything. This endpoint now only ever succeeds on an event that
has left `ACTIVE` — e.g. reverted to `DRAFT` by an approved activation refund — at which point it is
purely an admin correction tool, not something used on a live, paying event. `409 ADDON_NOT_ACTIVE`
(5041) if the event has no such add-on to begin with.

### It is billed up front at activation, then monthly

The add-on is **never free**. Activation buys the plan's whole `includedMonths` window in one
payment, and the add-on is charged for that same window in the same payment:

```
activation amount = plan.priceAmountMinor
                  + Σ(active recurring add-ons' price) × plan.includedMonths
```

So on a plan with `includedMonths: 3` and a €5/month add-on, opting in before paying adds €15 to
the activation total. **Show this in the plan picker** — the toggle changes the price on the "Pay
and publish" button, and a host who sees the number move only at the payment step will read it as a
surprise charge.

After that window, the add-on continues as a monthly charge on the preservation subscription (§7),
billed as **one combined line**, not a second charge:

```
subscription-checkout amount = plan.recurringPriceAmountMinor + Σ(active recurring add-ons' price)
```

Both order kinds carry the breakdown in `addonAmountMinor` — on an `ACTIVATION` order that is the
whole `× includedMonths` figure, on a `RENEWAL` it is one month's worth.

**If the host opts in after opening checkout**, the open order is cancelled and a re-priced one is
issued: the `orderId` (and redirect URL) you were holding changes. Re-read the order from the
checkout response rather than reusing a cached one after any `PATCH` that sets `keepOriginals`.

`POST /api/events/{eventId}/subscription-checkout` is otherwise unchanged (§7) — still no request
body, the add-on is read server-side from the event's entitlements. The response order now carries
the breakdown:

```jsonc
{ "id": "…", "kind": "RENEWAL", "status": "PAID",
  "amountMinor": 2000,        // plan 1500 + add-on 500
  "addonAmountMinor": 500,    // null when no add-on is active — the receipt line for it
                              // (on an ACTIVATION order this is the × includedMonths total)
  "currency": "EUR", … }
```

Render *"€15/month preservation + €5/month originals = €20/month"* from `amountMinor` and
`addonAmountMinor` rather than re-deriving it from the catalog — the order is the historical
receipt and the catalog price may have changed since.

### Retrieving the original

```http
GET /api/medias/{id}/original   → 200 { url: "https://…" }   # presigned, short-lived
```

**Host or the uploading member only** — `403` for anyone else, including other guests. `404` if the
event never opted in (no original was ever kept). This is a separate call from the normal feed URL:
the feed always serves the small derivative, and this is the only way to reach the full-resolution
file.

For bulk retrieval of the whole gallery at once (not one item at a time), see
[`gallery-archive-download-fe-integration.md`](gallery-archive-download-fe-integration.md) — the
host-only zip-download feature, which reads this same entitlement to decide whether the
`ORIGINAL` variant is offered.

### What the billing read endpoint adds

`GET /api/events/{eventId}/billing` (§8) gains an `addons` array:

```jsonc
{
  …,
  "addons": [
    { "code": "ORIGINALS", "name": "Keep Originals", "priceAmountMinor": 500,
      "billingPeriod": "MONTHLY", "activatedAt": "2026-08-01T10:00:00Z" },
    { "code": "UNLOCK_WISHLIST", "name": "Gift Wishlist", "priceAmountMinor": 300,
      "billingPeriod": "ONE_TIME", "activatedAt": "2026-08-01T10:00:00Z" }
  ]
}
```

`priceAmountMinor` on each is what it costs at its own `billingPeriod` — **so sum only the
`'MONTHLY'` rows** for the next renewal quote. A `'ONE_TIME'` row was paid for once at activation
and adds nothing to any future bill; it appears here because the host owns it, not because they owe
it. Only a `MODULE_UNLOCK` is ever `'ONE_TIME'` (§7c). Empty array on an event that never opted in. Each settled `RENEWAL`
order separately carries its own `addonAmountMinor` (the frozen breakdown at the time it was paid,
per the receipt note above) — the two are related but not the same number once a price changes.

---

## 7b. Storage packs

A one-time checkout that **permanently raises** an event's storage ceiling — the byte grant never
expires and is never refunded, following the same "buy ceiling, not time" shape as an admin plan
upgrade. The *price*, however, is now recurring: like §7a's add-on, a settled pack folds into the
event's monthly preservation subscription and is charged again on every renewal from then on — a
host who buys +50 GB is paying for the platform's ongoing cost of storing it, not a single deposit.

**Catalog:** the same `paidServices` array as §7a, filtered to `kind: 'STORAGE_PACK'`:

```jsonc
{
  "id": "…",
  "code": "STORAGE_5GB",
  "kind": "STORAGE_PACK",
  "name": "+5 GB Storage",
  "description": "Permanently raises this event's storage ceiling by 5 GB.",
  "priceAmountMinor": 500,
  "priceCurrency": "EUR",
  "billingPeriod": "MONTHLY",
  "grantsStorageBytes": 5368709120
}
```

### Buying one

```http
POST /api/events/{eventId}/storage-checkout
{ "paidServiceCode": "STORAGE_5GB" }
```

Host-only, rate limited 10/min (shared bucket with the other checkout endpoints), same response
shape and same two return routes as activation (§6 steps 3–5) — poll `GET /api/events/{id}/billing`
and watch the order, exactly the same way. A `409 EVENT_NOT_ACTIVE` (5014) or `409 EVENT_FROZEN`
(5016) if the event is not currently payable; buy after activating or renewing.

**The body names a catalog code, nothing else** — price and byte grant both come from that row
server-side, so a tampered body can at worst name a code that doesn't exist at all
(`404 RESOURCE_NOT_FOUND`, 2001), a real code that's archived or not public
(`409 PAID_SERVICE_NOT_PURCHASABLE`, 5036), or the wrong kind, e.g. the `ORIGINALS` code sent
here instead of §7a's endpoint (`400 INVALID_PAID_SERVICE_KIND`, 3015).

Buying two different packs in quick succession opens two independent orders — each pack gets its
own concurrency slot, so a second pack never silently reuses the first one's checkout session.

### What it changes

Once the order settles, the event's effective storage ceiling rises immediately and stays raised
forever — the "buy ceiling not time" note above is a promise, not just an event-order technicality.
`GET /api/events/{eventId}/usage` (§3) now separates the plan's own limit from purchased extra:

```jsonc
{
  "eventId": "…",
  "planTier": "BASIC",
  "storageBytes": 1900000000,
  "planStorageBytes": 2147483648,      // the plan's own ceiling
  "extraStorageBytes": 5368709120,     // sum of settled storage packs
  "storageLimitBytes": 7516192768,     // planStorageBytes + extraStorageBytes — the number that gates uploads
  "storagePercent": 25,
  …
}
```

Render *"2 GB plan + 5 GB purchased = 7 GB total"* from the two components; keep using
`storageLimitBytes`/`storagePercent` as the numbers that actually gate `5008` — they already include
purchased storage with no other change on your side. A `null` `planStorageBytes` (unlimited plan)
still means unlimited regardless of `extraStorageBytes`.

A settled pack also shows up in §7a's `addons` array on `GET /api/events/{eventId}/billing` — its
`priceAmountMinor` is what it currently adds to the next renewal quote, same as `ORIGINALS`. If a
live subscription is already open when the pack settles, that subscription is repriced in place
immediately (no separate action needed on your side — the next invoice just reflects the new total).

Storage packs are **final** in both directions. The byte grant is not refundable through the
refund-request flow in §9 (that path only ever reverses the activation order), and it survives an
approved activation refund — an event returned to `DRAFT` and later re-activated keeps its
purchased storage. And once an event is `ACTIVE`, a purchased pack cannot be removed by anyone,
admin included — paying for it is permanent for the life of the event; the only way it goes away is
the event itself lapsing. Say so at the point of purchase, since a host who expects a pack to unwind
with a refund has no way to find out otherwise until they ask.

---

## 7c. Module unlocks

*New 2026-08-16.* Sells one module to one event whose plan doesn't include it. This is what makes a
module free on the higher tiers and purchasable on the lower ones without maintaining two catalogs:
strip the key from the cheaper plans' `moduleKeys`, publish a `MODULE_UNLOCK` for it, and leave it in
the expensive plans' lists.

**Catalog:** the same `paidServices` array as §7a/§7b, filtered to `kind: 'MODULE_UNLOCK'`:

```jsonc
{
  "id": "…",
  "code": "UNLOCK_WISHLIST",
  "kind": "MODULE_UNLOCK",
  "name": "Gift Wishlist",
  "description": "Adds the wishlist module to this event.",
  "priceAmountMinor": 300,
  "priceCurrency": "EUR",
  "billingPeriod": "MONTHLY",
  "grantsStorageBytes": null,        // always null for a MODULE_UNLOCK
  "grantsModuleKey": "wishlist"      // always set, and always a key from eventModuleKeys
}
```

Join `grantsModuleKey` against `GET /api/config` → `modules[]` for the module's display name and
description rather than reusing the service's own `name` — the registry row is what the rest of the
UI labels that module with, and the two drifting apart is confusing on the one screen that shows
both.

### Monthly or bought outright

*New 2026-08-17.* **Read `billingPeriod` on every unlock and price it accordingly** — this is the
one kind where it is not always `'MONTHLY'`:

| `billingPeriod` | What the host pays | Where it appears afterwards |
| --- | --- | --- |
| `'MONTHLY'` | `priceAmountMinor × includedMonths` on the activation, then every renewal | `addons[]`, and inside every renewal's `addonAmountMinor` |
| `'ONE_TIME'` | `priceAmountMinor`, once, on the activation | `addons[]` only — **never** on a renewal |

A one-time unlock is **not** multiplied by the plan's `includedMonths`: the event's length says
nothing about the price of a feature. It is also the one add-on charge a plan with
`includedMonths: 0` still collects.

Label the two differently in the picker — "€3/month" versus "€3 once" — because the decision the
host is making is different. A one-time unlock is the more expensive-looking line on the activation
total and the cheaper one over the life of the event, and a UI that prices both the same way makes
that impossible to see.

**Both are draft-only, and for a one-time unlock that is load-bearing.** The activation checkout is
the only thing that ever charges it, so there is no "add it later" flow to build and no endpoint to
build it against — `POST /api/events/{id}/addons` returns `409 EVENT_NOT_DRAFT` (5017) once the
event is live, same as before. Surface the unlock picker during setup, before the activation
checkout, and treat the activation as the point of no return for it. If the host wants the module
afterwards, the answer is a plan upgrade (§6), not an unlock.

Re-reading `GET /api/events/{id}/billing` after activation shows the unlock in `addons[]` with its
`billingPeriod` — that is how you tell an owned one-time unlock from a recurring one when rendering
the "what you're paying for" list. Sum only the `'MONTHLY'` rows when you show a monthly total.

### Buying one — `DRAFT` only, and it is not a checkout

```http
POST /api/events/{eventId}/addons
{ "paidServiceCode": "UNLOCK_WISHLIST" }
```

Host-only, rate limited 30/min. Returns the same `AddonSummary` shape as the `addons` array in §8:

```jsonc
{ "code": "UNLOCK_WISHLIST", "name": "Gift Wishlist", "priceAmountMinor": 300,
  "billingPeriod": "ONE_TIME", "activatedAt": "…" }
```

**Nothing is charged at this moment.** Like §7a's `keepOriginals` toggle, the entitlement is the row
this creates, and the price folds into the activation payment (× `includedMonths`, per §7a's
formula) and then into every renewal. Render it as a toggle in the draft setup flow next to the plan
picker — **not** as a purchase button, and not on any live-event screen.

The same endpoint also accepts `RECURRING_ADDON` codes, which is the generic route to what §7a does
through `PATCH /api/events/{id}` with `keepOriginals`. Both paths create the same row; use whichever
suits the screen. A `STORAGE_PACK` code sent here is a `400 INVALID_PAID_SERVICE_KIND` (3015) —
storage is bought against a *live* event through §7b.

| Status | Code | When | What to do |
|---|---|---|---|
| `409` | `EVENT_NOT_DRAFT` (5017) | the event is already live | see the limitation below — don't offer the control at all there |
| `409` | `ADDON_ALREADY_ACTIVE` (5038) | already opted in | treat as success and refetch |
| `400` | `INVALID_PAID_SERVICE_KIND` (3015) | a storage-pack code | refetch `paidServices` |
| `404` | `RESOURCE_NOT_FOUND` (2001) | no such code | refetch `paidServices` |
| `409` | `PAID_SERVICE_NOT_PURCHASABLE` (5036) | archived or non-public | hide the offer |
| `409` | `PAID_SERVICE_NOT_ON_PLAN` (5040) | restricted to plans this event isn't on | filter the picker on `planTierIds` so this is unreachable |
| `403` | `FORBIDDEN` (4001) | caller isn't a host of the event | — |

### The limitation to design around

**There is no mid-cycle purchase path.** Unlocking a module on a live event would mean charging
immediately, which is the checkout-and-reprice shape only storage packs have. So the module picker
belongs in the event setup wizard, before activation; on a live event, a module the plan doesn't
include renders unavailable with **no buy affordance** — that call always `409`s.

The upgrade path still works as a way out: moving the event onto a plan whose `moduleKeys` include
the key opens it, because gate 2 is an OR (§4).

### Getting back out

There isn't a host-facing route, deliberately — same rule as §7a and §7b.
`DELETE /api/admin/events/{eventId}/addons/{code}` is admin-only and refuses on any `ACTIVE` event
(`409 ADDON_LOCKED_WHILE_ACTIVE`, 5042).

---

## 8. The billing read endpoint

```http
GET /api/events/{eventId}/billing        # host only
```

One read, everything about the event's money. This is what the plan-settings page
(`/events/{id}/settings/plan` — the destination of every dunning CTA) is built from, and the correct
polling target after any checkout.

```jsonc
{
  "eventStatus": "ACTIVE",
  "planTierCode": "EVENT_STANDARD",
  "planTierName": "Standard",
  "coverage": {
    "unlimited": false,                    // true = created before billing existed
    "paidThrough": "2026-09-12T00:00:00Z",
    "covered": true,                       // does coverage reach right now
    "freezesAt": "2026-09-26T00:00:00Z",   // null when unlimited
    "purgesAt":  "2026-10-26T00:00:00Z"    // null when unlimited
  },
  "subscription": {                        // null when there is no live subscription
    "id": "…",
    "status": "ACTIVE",
    "currentPeriodEnd": "2026-09-12T00:00:00Z",
    "cancelAtPeriodEnd": false,            // true = cancelled, paid month still running
    "cancelledAt": null
  },
  "orders": [                              // newest first; every order ever placed on this event
    { "id": "…", "kind": "ACTIVATION", "status": "PAID",
      "amountMinor": 4900, "currency": "EUR",
      "coversFrom": "…", "coversUntil": "…", "paidAt": "…", "createdAt": "…" }
  ]
}
```

- **`unlimited: true` must render as "included, no renewal needed"** — not as a missing date, and
  never with a freeze warning. These are events that predate billing; they owe nothing and will never
  freeze.
- `freezesAt` and `purgesAt` are **computed, not stored**, and move whenever a payment lands. Re-read
  after any settlement rather than caching them.
- No provider session or payment ids are returned. If support needs them, that is an admin question.

---

## 9. Refunds

A refund is **requested**, not taken. There is no endpoint that moves money on a host's say-so.

```
host clicks "Request a refund"
        │
        ├─ server checks four gates ──► fails ──► 409 REFUND_NOT_ELIGIBLE, with reasons
        ▼
   PENDING request ──► admin reviews the queue
        │                        ├─ approve ──► money back + event → DRAFT + host notified
        │                        └─ reject  ──► nothing changes + host notified
        ▼
   host sees status on the event's billing page
```

### The four gates

An activation payment is refundable only while **all four** hold:

| gate | fails when |
|---|---|
| nobody but the host joined | any non-host member has ever existed, *including ones since removed* |
| no content exists | any post or media has ever existed, *including soft-deleted ones* |
| the refund window is open | more than 14 days (configurable) since the payment settled |
| the event has not started | `startAt` is in the past |

The "including deleted" part is deliberate and worth surfacing if a host asks: the bytes were stored
and paid for whether or not they are still visible, so deleting a gallery does not make an event
refundable again.

**Only the activation order is refundable.** Renewals buy storage that has already been consumed.

### What approval does to the event

The event goes back to `DRAFT`. It disappears from guests, becomes unpublished, and needs a fresh
activation payment to come back. **Your confirmation dialog must say this plainly** — "your event
will be taken offline and returned to draft" — because it is not what "refund" implies on its own.

### `GET /api/events/{eventId}/refund-eligibility` — host

Call it when the billing page loads. It decides whether you render the button at all.

```jsonc
{
  "eligible": false,
  "reasons": [
    "3 people have already joined this event.",
    "Content has already been added to this event."
  ],
  "hasPendingRequest": false
}
```

- `reasons` are written to be shown to the host **verbatim**. They state facts about the host's own
  event that they can check themselves. Do not paraphrase them into "not eligible".
- **Every** failing reason is returned, not the first. A host who clears one obstacle and is then
  told about a second reads it as the platform inventing obstacles — show the whole list at once.
- `hasPendingRequest` is separate from `eligible` on purpose: a host with a request in flight should
  see "we're looking at it", not the gates.

Advisory only; everything is re-checked when a request is actually made.

| state | show |
|---|---|
| `hasPendingRequest: true` | "Refund request under review" + the pending request |
| `eligible: true` | the "Request a refund" button |
| `eligible: false` | the button **disabled**, with `reasons` as the explanation — hiding it entirely just produces a support ticket |

### `POST /api/events/{eventId}/refund-requests` — host

```jsonc
{ "reason": "I created this event by mistake and haven't used it." }
```

`reason` is **required**, non-blank, max 1000 chars. Stored verbatim and the first thing the admin
reads — make it a textarea with a real prompt, not an afterthought. Rate limited to **5 per hour per
user**. Returns a `RefundRequestResponse` (§14).

### `GET /api/events/{eventId}/refund-requests` — host

The event's request history, newest first. Drives the "under review" panel and shows a past rejection
with the admin's note.

### `GET /api/admin/refund-requests` — admin

The queue, oldest first, **with the usage evidence behind each request**. This is what the admin
refund screen is built on.

```jsonc
[
  {
    "request": { /* RefundRequestResponse — §14 */ },

    "eventTitle": "Anna & Nik's Wedding",
    "eventStatus": "ACTIVE",
    "eventStartAt": "2026-09-12T16:00:00Z",
    "eventEndAt": "2026-09-13T02:00:00Z",
    "paidAt": "2026-08-05T09:14:22Z",

    "hostDisplayName": "Nikos P.",
    "hostEmail": "nikos@example.com",

    "currentlyEligible": true,
    "ineligibilityReasons": [],

    "guestCount": 0,
    "hostCount": 1,
    "postCount": 0,
    "mediaCount": 0,
    "storageBytes": 0
  }
]
```

**Why these fields exist.** The server enforces the gates on approval regardless — but "the server
will stop you" is not the same as "you can tell whether to say yes". The gates are four crude proxies
for *did this host get what they paid for*, and the admin's actual job is the cases the gates cannot
see: an event created by mistake, a duplicate payment, the wrong tier bought. Deciding that from a
request id and a paragraph of free text means clicking approve and hoping.

So build the screen around the evidence, not the buttons:

- Put `guestCount` / `postCount` / `mediaCount` / `storageBytes` where they are read **before** the
  approve button, not in a collapsed panel.
- The counts include soft-deleted rows, matching the gates exactly. A host who uploaded fifty photos
  and deleted them shows as `mediaCount: 50` — that is the point.
- `currentlyEligible: false` means **approving will be refused** with a `409`. Disable approve and
  show `ineligibilityReasons`. This happens when an event is used while its request sits in the
  queue.
- `hostEmail` is here because deciding a refund usually means contacting the host first. Admin-only;
  it never appears on the host-facing shape.
- **Reject stays available when `currentlyEligible` is false** — that is exactly when it is used.

### `POST /api/admin/refund-requests/{requestId}/approve` — admin

```jsonc
// body optional
{ "note": "Duplicate payment — refunded the second charge." }
```

`note` is optional, max 1000 chars, and **is shown to the host** in their notification. Label the
field accordingly ("this note is sent to the host").

Approving, in order: asks the provider to reverse the charge → reverses the order so it stops
counting as coverage → returns the event to `DRAFT` → notifies the host.

**Watch `providerRefunded` in the response.** `false` on an approved request means **no money
actually moved** and somebody has to return it by hand — the manual provider has no charge to
reverse, and a provider call can fail. Surface it as a warning row in the decided list, not as a
silent field.

### `POST /api/admin/refund-requests/{requestId}/reject` — admin

Same body. Nothing about the order or the event changes; the note is the entire outcome and is what
the host is owed by way of an answer. Treat it as effectively required in your UI even though the
server allows null.

Both decision endpoints are rate limited to **30/min per admin**, shared with `POST /orders/{id}/settle`.

---

## 10. Notifications

All billing notifications arrive through the existing feed — `GET /api/notifications`,
`GET /api/notifications/unread-count`, `PATCH /api/notifications/{id}/read`,
`PATCH /api/notifications/read-all`, `DELETE /api/notifications/{id}` — with no new plumbing.

Every one below is `category: "BILLING"`, which means it is **emailed as well as shown in the feed**,
and every one carries `ctaRoute: "/events/{eventId}/settings/plan"`. **That route must exist** — it is
the destination of every billing email and in-app CTA.

### Dunning — produced by the scheduled sweep, hosts only

| `type` | severity | fires at | payload |
|---|---|---|---|
| `BILLING_EXPIRING` | `WARNING` | 30 / 14 / 7 / 1 days before coverage ends | `paidThrough`, `daysRemaining`, `planTier` |
| `BILLING_PAST_DUE` | `CRITICAL` | 0 / 3 / 7 days after it lapsed | `paidThrough`, `daysOverdue`, `daysUntilFreeze`, `planTier` |
| `BILLING_PURGE_WARNING` | `CRITICAL` | 14 / 7 / 1 days before the media is deleted | `purgesAt`, `daysRemaining`, `storedBytes`, `planTier` |

Only the most urgent crossed threshold fires, so a host gets roughly four messages across a 45-day
arc, not forty-five. `daysUntilFreeze` and `daysRemaining` are precomputed server-side — render them
directly so the copy matches the email the host already received.

### Refund decisions — produced by the admin's action

| `type` | severity | when |
|---|---|---|
| `REFUND_APPROVED` | `CRITICAL` | the refund went through and the event returned to `DRAFT` |
| `REFUND_REJECTED` | `INFO` | the request was declined |

The admin's note is included in the body. The payload carries what the UI needs without a second
fetch:

```jsonc
{
  "refundRequestId": "…",
  "orderId": "…",
  "amountMinor": 4900,
  "currency": "EUR",
  "providerRefunded": true
}
```

`providerRefunded: false` on an approved refund means the money is being returned by hand — do not
tell the host to expect it on their statement in the usual few days.

`REFUND_APPROVED` is the only notification that reports an event *losing* its live status, so it
doubles as the explanation for a host who would otherwise find a draft they did not expect. Give it
real weight in the feed.

### What to add on your side

Add `BILLING` to any notification-category filter UI, and all five types above to the
`NotificationType` union in `frontend-api-types.ts`. Unknown types should already render as a generic
row rather than crashing — if yours does not, fix that before this ships.

---

## 11. Rate limiting and the 429

**Every `/api/**` endpoint has a request budget.** Endpoints without a specific limit get a generous
default (300/min per caller) that only a stuck client will ever hit.

Authenticated callers are counted **per user id**, anonymous ones per IP. Admin routes are *not*
exempt — an admin account can move money and destroy media, which makes a runaway script holding
admin credentials the most expensive kind to have.

```
HTTP/1.1 429 Too Many Requests
Retry-After: 42
```
```jsonc
{
  "type": "about:blank",
  "title": "Too Many Requests",
  "status": 429,
  "detail": "Too many requests. Try again in 42 seconds.",
  "instance": "/api/auth/login",
  "errorCode": 3010,
  "errorKey": "RATE_LIMITED",
  "retryAfterSeconds": 42
}
```

### Handle it once, globally

In your API client interceptor, not at call sites:

- **Do not auto-retry blindly.** Retrying a `429` immediately is what produced it. If you retry at
  all, wait `retryAfterSeconds` (identical to the `Retry-After` header) and retry once.
- **Never auto-retry a non-idempotent call.** Checkout, refund requests and admin approvals must
  surface to the user instead; a silently retried approval is a second refund.
- Show the wait on user-facing surfaces. The `detail` string already says exactly this if you would
  rather render it directly.
- Disable the submitting control for `retryAfterSeconds` rather than leaving a button that only fails
  again.

### The limits that will actually be hit

| endpoint | limit | why it matters to you |
|---|---|---|
| `POST /api/auth/login` | 10 / min | a login form that retries on failure will trip this |
| `POST /api/auth/register` | 5 / hour | a user who mistypes their email a few times locks themselves out for the hour — say so clearly |
| `POST /api/auth/refresh` | 30 / min | **the one most likely to bite** — see below |
| `POST /api/auth/guest-login` | 20 / min | guests re-opening an invite link |
| `POST /api/events/{id}/checkout` | 10 / min | shared with `subscription-checkout` |
| `DELETE /api/events/{id}/subscription` | 10 / hour | per user; generous for a button pressed once |
| `POST /api/events/{id}/refund-requests` | 5 / hour | per user, not per event |
| admin decisions and settlement | 30 / min | per admin |

**The refresh storm.** If your client fires ten requests, all get a `401`, and all ten independently
call `/refresh`, you will hit the limit under ordinary use. Deduplicate: one in-flight refresh, queue
the rest behind it.

> **Counters are per-instance and in-memory.** With N app instances behind a load balancer the
> effective budget is N times the number above. These are a brake on runaway clients, not an edge
> defence — do not build anything that depends on the limit being exact.

---

## 12. Error codes, all of them

RFC 7807 `ProblemDetail` with a numeric `errorCode` (the stable contract) and an `errorKey` (the enum
name, for logs). Branch on `errorCode`.

### Validation and request shape

| code | HTTP | when | what to show |
|---|---|---|---|
| `3001` `VALIDATION_FAILED` | 400 | any bean-validation failure, incl. all plan-tier field rules | field-level errors from `details` |
| `3007` `INVALID_PLAN_TIER_SCOPE` | 400 | admin sets `eventTypeKeys` on an `ACCOUNT`-scope plan (§13), or `planTierIds` names one for a paid service | admin panel only |
| `3008` `EVENT_DATES_INCOMPLETE` | 400 | checkout with no `endAt`, or `endAt <= startAt` | "Set an end date before publishing" — link to the schedule form |
| `3010` `RATE_LIMITED` | 429 | the caller's budget for the window is spent | §11 |
| `3018` `INVALID_EVENT_TYPE` | 400 | unknown `eventType` at `GET /api/plan-tiers?eventType=X` or admin's `.../event-types` (§2, §13) | refetch `GET /api/config`'s `eventTypeKeys`, the value was stale or mistyped |

### Plans and quotas

| code | HTTP | when | what to show |
|---|---|---|---|
| `5008` `EVENT_STORAGE_LIMIT_EXCEEDED` | 409 | upload exceeds the event plan's storage | upgrade prompt built from `details` |
| `5009` `EVENT_MEMBER_LIMIT_EXCEEDED` | 409 | member add / invite acceptance exceeds the cap | upgrade prompt |
| `5011` `PLAN_TIER_IN_USE` | 409 | admin deleting a plan that is still assigned | offer archiving instead |
| `5012` `MODULE_NOT_AVAILABLE` | 409 | a module action where `isAvailable` is false | "not included in this plan" — and, if a matching `MODULE_UNLOCK` exists in `paidServices`, the §7c offer |
| `5013` `PLAN_TIER_IS_ONLY_DEFAULT` | 409 | admin removing the last default plan | admin panel only |
| `5015` `PLAN_TIER_NOT_PURCHASABLE` | 409 | the plan was archived or hidden since page load | refetch `/api/config`, ask them to pick again |
| `5019` `PLAN_TIER_NOT_PRICED` | 409 | catalog misconfiguration — no activation or monthly price | generic error + support contact; the host cannot fix this |
| `5021` `PLAN_TIER_CURRENCY_UNSUPPORTED` | 409 | the plan's currency is not supported by the provider | admin-facing; host sees a generic failure |
| `5034` `ACCOUNT_PLANS_DISABLED` | 409 | admin tries to create an `ACCOUNT`-scope plan, or move a user onto a different one | admin-facing; remove/disable the control (§13) |
| `3015` `INVALID_PAID_SERVICE_KIND` | 400 | a code sent to an endpoint that doesn't serve its kind — a `STORAGE_PACK` code at the add-on opt-in (§7c), or a `RECURRING_ADDON`/`MODULE_UNLOCK` code at `storage-checkout` (§7b) | refetch `paidServices`, the code was mislabeled client-side |
| `2001` `RESOURCE_NOT_FOUND` | 404 | paid-service code doesn't exist in the catalog at all | refetch `paidServices`, the code was stale or mistyped |
| `5036` `PAID_SERVICE_NOT_PURCHASABLE` | 409 | code exists but is archived or non-public | refetch `paidServices` and ask them to pick again |
| `5037` `PAID_SERVICE_IN_USE` | 409 | admin deleting a paid service that is still referenced by an order, or patching `billingPeriod` on one that events already hold | offer archiving instead, plus a new code at the new cadence (admin panel only) |
| `5038` `ADDON_ALREADY_ACTIVE` | 409 | opting into an add-on that is already active on the event | refetch the event; the toggle is already on |
| `5039` `PAID_SERVICE_CURRENCY_MISMATCH` | 409 | the event's active add-ons are priced in a different currency to its plan | catalog misconfiguration; host sees a generic failure and support has to fix the catalog |
| `5040` `PAID_SERVICE_NOT_ON_PLAN` | 409 | the service is restricted to plan tiers this event is not on | filter the purchase UI by `planTierIds` (below) so this is unreachable from a fresh catalog |
| `5041` `ADDON_NOT_ACTIVE` | 409 | admin removing an add-on the event never had | admin panel only; refetch the event's add-ons |
| `5042` `ADDON_LOCKED_WHILE_ACTIVE` | 409 | admin removing an entitlement (add-on or storage pack) from an `ACTIVE` event | admin panel only; not fixable — the event must leave `ACTIVE` first (e.g. an activation refund) |

### Lifecycle and checkout

| code | HTTP | when | what to show |
|---|---|---|---|
| `5014` `EVENT_NOT_ACTIVE` | 409 | subscription checkout on a `DRAFT`; or a guest/module action on one | send to activation / "not published yet" |
| `5016` `EVENT_FROZEN` | 409 | **any write** on a `FROZEN` or `PURGED` event | read-only banner + link to the plan page |
| `5017` `EVENT_NOT_DRAFT` | 409 | activation checkout on an event already live/frozen/purged | usually a stale tab; refetch the event |
| `5018` `ORDER_NOT_PENDING` | 409 | admin settling an already-settled order | admin panel only |
| `5020` `SUBSCRIPTION_ALREADY_ACTIVE` | 409 | subscription checkout with one already live; also fired by the admin plan-tier-reassignment endpoint (§13) when the event's subscription is still collecting | show the existing subscription (host-facing); admin panel only for the reassignment case — cancel/replace the subscription first |
| `5026` `SUBSCRIPTION_NOT_LIVE` | 409 | cancelling with no live subscription | stale tab; refetch `/billing` |
| `5027` `SUBSCRIPTION_CANCEL_FAILED` | 502 | the provider would not stop it | "Couldn't stop it just now — try again shortly." It is **still billing**; do not show it as cancelled |
| `5046` `CHECKOUT_AMOUNT_BELOW_MINIMUM` | 409 | a plan discount cut a checkout's price below what the provider will charge at all | catalog misconfiguration (discount set too steep); host sees a generic failure and support has to fix the discount |
| `5053` `PLAN_TIER_NOT_AVAILABLE_FOR_EVENT_TYPE` | 409 | `POST /api/events`'s `planTierCode` has restricted itself away from the request's `eventType` (§2, §6) | source the plan list from `GET /api/plan-tiers?eventType=X` instead of a stale/cached one |

### Refunds

| code | HTTP | when | what to show |
|---|---|---|---|
| `5022` `REFUND_NOT_ELIGIBLE` | 409 | a gate failed at request time, or the event was used while queued | the `detail` string — it is the joined `reasons`, written for the host |
| `5023` `REFUND_ALREADY_REQUESTED` | 409 | a request is already awaiting a decision | refetch eligibility; show the pending panel |
| `5024` `REFUND_REQUEST_NOT_PENDING` | 409 | admin decided an already-decided request | double-click or stale queue; refetch |
| `5025` `ORDER_NOT_REFUNDABLE` | 409 | no settled activation payment, or it is no longer `PAID` | "There's no payment on this event to refund" |

`403` on any host endpoint means the caller is not a host. Co-hosts count as hosts.

### Handle `5016` globally

`EVENT_FROZEN` comes back from *every* write path — gallery upload, post, comment, reaction, story,
playlist, RSVP, member changes. It is a single server-side gate, so handle it once in your error
interceptor (banner + refetch the event to pick up the new `status`) rather than at twenty call
sites.

---

## 13. Admin endpoints

All require `ROLE_ADMIN`; non-admins get `403`.

### Money and lifecycle

| endpoint | effect |
|---|---|
| `POST /api/admin/orders/{orderId}/settle` | marks an order paid without a provider payment — bank transfer, comped event, lost webhook. Activates the event exactly as a real payment would. |
| `POST /api/admin/events/{id}/freeze` | forces an event read-only. For testing the frozen state before the sweep is enabled everywhere. |
| `POST /api/admin/events/{id}/purge` | **destroys the event's media in storage. Irreversible.** Returns `false` if some files could not be deleted (the event stays `FROZEN`; a later call retries). Needs a confirmation dialog that names the event. |
| `GET /api/admin/webhooks/unprocessed` | deliveries received but never processed — settlements the platform may have lost. The remedy is usually `settle` above. |
| `GET /api/admin/refund-requests` | the refund queue with usage evidence (§9) |
| `POST /api/admin/refund-requests/{id}/approve` \| `/reject` | decide a request (§9) |

### The plan catalog

| endpoint | notes |
|---|---|
| `GET /api/admin/plan-tiers?scope=EVENT&includeArchived=true` | both params optional. Unlike `/api/config`, returns non-public and archived plans — the admin's full view. |
| `GET /api/admin/plan-tiers/{id}` | `404` if not found |
| `POST /api/admin/plan-tiers` | create; validation below |
| `PATCH /api/admin/plan-tiers/{id}` | partial update. **`code` and `scope` are immutable** and absent from the patch DTO. |
| `DELETE /api/admin/plan-tiers/{id}` | `204`, or `409 PLAN_TIER_IN_USE` if assigned to any user or event |
| `PUT /api/admin/plan-tiers/{id}/modules` | sets `moduleKeys` |
| `PUT /api/admin/plan-tiers/{id}/event-types` | sets `eventTypeKeys` — replace semantics, same as `/modules` above: `{ "eventTypeKeys": [...] }` is the plan's complete restriction, not a diff. `{ "eventTypeKeys": [] }` clears it back to "every type". Unknown key → `400 INVALID_EVENT_TYPE` (3018); `ACCOUNT`-scope plan → `400 INVALID_PLAN_TIER_SCOPE` (3007) |

Create/patch validation (server-enforced, `400` / `3001`):

- `code` — required, non-blank, ≤30 chars, `^[A-Z0-9_]+$`. Unique **per scope**, not globally.
- `scope`, `name`, `sortOrder`, `isDefault`, `isAssignable`, `isPublic` — required on create.
- `name` ≤100 chars; `sortOrder >= 0`.
- `storageBytes`, `maxMembers`, `priceAmountMinor`, `recurringPriceAmountMinor` — if present, `>= 0`.
- `priceCurrency` — if present, exactly 3 chars (ISO 4217).
- `discountPercent` — if present, 0–100. `discountLabel` ≤100 chars.
- `billingPeriod` — `'MONTHLY' | 'YEARLY' | 'ONE_TIME'` or null.
- `recurringPriceAmountMinor` / `includedMonths` — rejected on `ACCOUNT`-scope plans.

**Prefer archiving to deleting.** `PATCH { "isAssignable": false }` keeps the plan visible to admins
and to anyone already on it, while hiding it from new assignment. `isPublic` independently controls
catalog visibility. Delete is for a plan created by mistake and never assigned.

### Assignment

| endpoint | body | returns |
|---|---|---|
| `PATCH /api/admin/users/{id}/plan-tier` | `{ "planTierCode": "PRO" }` | **always `409 ACCOUNT_PLANS_DISABLED`** — see below |
| `PATCH /api/admin/events/{id}/plan-tier` | `{ "planTierCode": "PLUS" }` — must be `EVENT` scope | `EventUsageResponse` |

**Account plans are disabled as of 2026-08-11** (`account-plans-disabled-and-platform-metrics-fe-integration.md`
has the full change). `PATCH /api/admin/users/{id}/plan-tier` now unconditionally rejects with
`errorCode: 5034 ACCOUNT_PLANS_DISABLED` — remove or disable any admin UI for reassigning a user's
account plan. `POST /api/admin/plan-tiers` with `"scope": "ACCOUNT"` rejects the same way, so an
account plan can no longer be created either. Everything else about `ACCOUNT`-scope plans (read,
patch, delete) still works normally — only *create* and *assign* are blocked.

The event-plan assignment endpoint is unaffected: the response is still a fresh usage snapshot
against the new plan's limits, so an admin sees immediately whether it's already exceeded — there
is no proration or commerce flow behind this. `planTierCode` is required, non-blank, ≤30 chars; an
unknown code or a scope mismatch errors rather than silently no-op'ing.

### Modules and flags

| endpoint | notes |
|---|---|
| `GET /api/admin/platform-modules` | every registry row including disabled, by `sortOrder` |
| `PATCH /api/admin/platform-modules/{moduleKey}` | every field optional. **No create or delete** — the module set is fixed by backend code. `isEnabled: false` is the fastest way to withdraw a broken module platform-wide without a deploy. |
| `PATCH /api/platform-feature-flags/{id}` | `description` (≤100), `isEnabled`, `configuration` (arbitrary JSON). `featureKey` is not patchable. |

### The paid-services catalog (add-on + storage packs + module unlocks)

Mirrors the plan-tier admin surface (above) field-for-field — same archive-don't-delete guidance,
same validation shape.

| endpoint | notes |
|---|---|
| `GET /api/admin/paid-services?kind=&includeArchived=` | both params optional. Unlike `/api/config`, returns non-public and archived services. |
| `GET /api/admin/paid-services/{id}` | `404` if not found |
| `POST /api/admin/paid-services` | create; validation below |
| `PATCH /api/admin/paid-services/{id}` | partial update. **`code` and `kind` are immutable** and absent from the patch DTO. |
| `DELETE /api/admin/paid-services/{id}` | `204`, or `409 PAID_SERVICE_IN_USE` (5037) if any order references it |

Create/patch validation (`400` / `3001` unless noted):

- `code` — required, non-blank, ≤30 chars, `^[A-Z0-9_]+$`. Unique across the whole catalog (not
  scoped like plan codes).
- `kind` — required on create, immutable after:
  `'STORAGE_PACK' | 'RECURRING_ADDON' | 'MODULE_UNLOCK'`.
- `grantsStorageBytes` — **required** for `STORAGE_PACK`, **rejected** on either other kind.
- `grantsModuleKey` — **required** for `MODULE_UNLOCK`, **rejected** on either other kind. Must name
  a module the registry actually has a row for, so populate the admin form's picker from
  `GET /api/admin/platform-modules` rather than a hand-kept list — a key with no module behind it is
  a catalog row that takes money for nothing, and is refused for that reason. Unlike `code` and
  `kind` this one **is** patchable — and unlike a price edit, **repointing it is retroactive**:
  entitlement is resolved live from this field, so every event that already bought the unlock loses
  the old module and gains the new one at the next request. Warn on it in the admin form; the
  non-destructive move is a new service code, archiving the old one.
- `billingPeriod` — **enforced against `kind`**: `'MONTHLY'` for `STORAGE_PACK` and
  `RECURRING_ADDON`, `'MONTHLY'` or `'ONE_TIME'` for `MODULE_UNLOCK`; anything else (and `'YEARLY'`
  anywhere) → `400 VALIDATION_FAILED`. So the admin form should offer a picker **only** when `kind`
  is `MODULE_UNLOCK`, and derive `'MONTHLY'` otherwise. The two storage-bearing kinds are fixed
  because what they grant keeps costing money every month it is held; a module left switched on does
  not, which is why it is the one kind that can be sold outright.
- **`billingPeriod` is not patchable once events hold the service** → `409 PAID_SERVICE_IN_USE`
  (5037). Changing it would rewrite what existing entitlements cost in one of two wrong directions:
  `MONTHLY`→`ONE_TIME` silently stops billing events that were only ever charged monthly, and
  `ONE_TIME`→`MONTHLY` starts billing events that already paid outright. The non-destructive move is
  the usual one — archive with `isAssignable: false` and publish a new code at the new cadence. Every
  other field on a held service still patches normally; disable just this control once the service
  has been sold.
- `planTierIds` — optional `string[]` of EVENT-scope plan tier ids this service is offered on.
  **Omitted or `[]` means every plan**, which is what the whole seeded catalog uses; list tiers only
  to restrict. On `PATCH` it replaces the set wholesale, so send `[]` to lift a restriction and omit
  the field to leave it alone. Unknown id → `404`; an `ACCOUNT`-scope id → `400
  INVALID_PLAN_TIER_SCOPE`. Buying a service the event's plan is not listed for → `409
  PAID_SERVICE_NOT_ON_PLAN` (5040), so filter the host-facing purchase UI on this.
- `priceAmountMinor >= 0`, `priceCurrency` exactly 3 chars, `name` ≤100 chars, `sortOrder >= 0`.
  Keep every service's `priceCurrency` equal to the plans' — an add-on priced in another currency
  cannot be added to the plan amount, and checkout refuses with `409
  PAID_SERVICE_CURRENCY_MISMATCH` (5039) rather than mispricing the charge.

Editing a service's price only affects **future** checkouts — a settled order keeps the price it was
opened at, per §7a/§7b's "the order is the historical receipt" note.

### Platform metrics

| endpoint | notes |
|---|---|
| `GET /api/admin/metrics` | dashboard counts: users/events totals, active counts, both grouped by plan/status, and a `storage` block (used/pending-purge/committed/paid-vs-free/purchased-extra bytes plus an estimated monthly cost). No params, computed live on every call. Full field reference in `account-plans-disabled-and-platform-metrics-fe-integration.md`. |

---

## 14. TypeScript types

```ts
// ---------- Plans ----------
export type PlanScope = 'ACCOUNT' | 'EVENT';
export type BillingPeriod = 'MONTHLY' | 'YEARLY' | 'ONE_TIME';

export interface PlanTierResponse {
  id: string;
  code: string;                 // NOT a fixed union — admins create these at runtime
  scope: PlanScope;
  name: string;
  description: string | null;
  sortOrder: number;
  isDefault: boolean;
  isAssignable: boolean;
  isPublic: boolean;

  storageBytes: number | null;  // null = unlimited
  maxMembers: number | null;    // null = unlimited

  priceAmountMinor: number | null;
  priceCurrency: string | null;
  billingPeriod: BillingPeriod | null;
  recurringPriceAmountMinor: number | null;  // null on ACCOUNT scope
  includedMonths: number | null;             // null on ACCOUNT scope

  discountPercent: number | null;
  discountLabel: string | null;
  discountStartsAt: string | null;
  discountEndsAt: string | null;

  moduleKeys: string[];         // always empty on ACCOUNT scope
  eventTypeKeys: string[];      // empty = purchasable for every event type; always empty on ACCOUNT scope
  paidModules: PaidServiceResponse[] | null;  // MODULE_UNLOCK upsells; null only from admin catalog endpoints
}

// ---------- Paid services (add-on + storage packs + module unlocks) ----------
export type PaidServiceKind = 'STORAGE_PACK' | 'RECURRING_ADDON' | 'MODULE_UNLOCK';

export interface PaidServiceResponse {
  id: string;
  code: string;                 // NOT a fixed union — admins create these at runtime
  kind: PaidServiceKind;
  name: string;
  description: string | null;
  sortOrder: number;
  isAssignable: boolean;
  isPublic: boolean;
  priceAmountMinor: number;
  priceCurrency: string;
  billingPeriod: BillingPeriod; // 'MONTHLY', or 'ONE_TIME' on a MODULE_UNLOCK — see §13
  grantsStorageBytes: number | null;  // set only on STORAGE_PACK, null on the other two
  grantsModuleKey: string | null;     // set only on MODULE_UNLOCK, null on the other two
  planTierIds: string[];        // plan tiers this is offered on; EMPTY MEANS EVERY PLAN
}

export interface EventAddon {
  code: string;
  name: string;
  priceAmountMinor: number;     // what this costs at billingPeriod's cadence
  billingPeriod: BillingPeriod; // 'MONTHLY' (on every renewal) or 'ONE_TIME' (paid at activation)
  activatedAt: string;
}

// POST /api/events/{eventId}/addons — host, DRAFT only. Returns an EventAddon (§7c).
export interface EventAddonRequest {
  paidServiceCode: string;      // a RECURRING_ADDON or MODULE_UNLOCK code
}

// ---------- Usage ----------
export interface EventUsageResponse {
  eventId: string;
  planTier: string;             // plain string, not a union
  storageBytes: number;
  planStorageBytes: number | null;   // the plan's own ceiling, before purchased extra
  extraStorageBytes: number;         // bytes added by settled storage packs
  storageLimitBytes: number | null;  // planStorageBytes + extraStorageBytes — what gates uploads
  storagePercent: number;
  memberCount: number;
  memberLimit: number | null;
  memberPercent: number;
}

// AccountUsageResponse (GET /api/me/usage) was removed 2026-08-24 — the endpoint is gone, along
// with the account-level active-event cap it reported. Delete any type/call still referencing it.

// ---------- Lifecycle ----------
// BREAKING: widens from 'DRAFT' | 'ACTIVE'. Any exhaustive switch needs updating.
export type EventStatus = 'DRAFT' | 'ACTIVE' | 'FROZEN' | 'PURGED';

// ---------- Checkout ----------
export interface CheckoutResponse {
  orderId: string;
  redirectUrl: string;
}

// ---------- Billing ----------
export interface EventBillingResponse {
  eventStatus: EventStatus;
  planTierCode: string;
  planTierName: string;
  coverage: CoverageSummary;
  subscription: SubscriptionSummary | null;
  orders: OrderSummary[];       // newest first
  addons: EventAddon[];         // empty if never opted in
}

export interface CoverageSummary {
  unlimited: boolean;           // grandfathered: never expires
  paidThrough: string | null;   // null iff unlimited
  covered: boolean;
  freezesAt: string | null;     // null iff unlimited
  purgesAt: string | null;      // null iff unlimited
}

export interface SubscriptionSummary {
  id: string;
  status: 'ACTIVE' | 'PAST_DUE' | 'CANCELLED';
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;   // cancelled, but the paid month is still running
  cancelledAt: string | null;
}

export interface OrderSummary {
  id: string;
  kind: 'ACTIVATION' | 'RENEWAL' | 'UPGRADE' | 'STORAGE_PACK';
  status: 'PENDING' | 'PAID' | 'FAILED' | 'CANCELLED';
  amountMinor: number;
  addonAmountMinor: number | null;  // the add-on's slice of amountMinor on an ACTIVATION
                                    // (× includedMonths) or a RENEWAL (one month); else null
  currency: string;
  coversFrom: string | null;    // null on UPGRADE and STORAGE_PACK — they buy ceiling, not time
  coversUntil: string | null;   // null on UPGRADE and STORAGE_PACK
  paidAt: string | null;
  createdAt: string;
}

// ---------- Refunds ----------
export type RefundRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface RefundEligibilityResponse {
  eligible: boolean;
  reasons: string[];            // show verbatim
  hasPendingRequest: boolean;
}

export interface RefundRequestResponse {
  id: string;
  eventId: string;
  orderId: string;
  status: RefundRequestStatus;
  reason: string;               // the host's own words
  amountMinor: number | null;
  currency: string | null;
  requestedById: string;
  requestedAt: string;
  decidedById: string | null;
  decidedAt: string | null;
  decisionNote: string | null;  // safe to show the host — written for them
  providerRefunded: boolean;    // false on APPROVED = money returned by hand
}

export interface RefundRequestAdmin {
  request: RefundRequestResponse;
  eventTitle: string;
  eventStatus: EventStatus;
  eventStartAt: string | null;
  eventEndAt: string | null;
  paidAt: string | null;
  hostDisplayName: string | null;
  hostEmail: string | null;     // admin-only
  currentlyEligible: boolean;
  ineligibilityReasons: string[];
  guestCount: number;
  hostCount: number;
  postCount: number;
  mediaCount: number;
  storageBytes: number;
}

// ---------- Admin metrics ----------
export interface PlatformMetricsResponse {
  totalUsers: number;
  activeUsers: number;
  usersByAccountPlan: Record<string, number>;

  totalEvents: number;
  activeEvents: number;
  eventsByStatus: Record<string, number>;   // keys: DRAFT | ACTIVE | FROZEN | PURGED, missing = 0
  eventsByPlanTier: Record<string, number>;

  storage: PlatformStorageMetrics;
}

export interface PlatformStorageMetrics {
  usedBytes: number;                  // non-deleted media, derivative + original
  pendingPurgeBytes: number;          // soft-deleted, still in R2 — Cloudflare bills it, quota does not
  committedBytes: number;             // sum of effective limits sold — headroom, NOT spend
  paidUsedBytes: number;              // usedBytes on events with any paid coverage history
  freeUsedBytes: number;              // usedBytes on grandfathered / never-paid events
  purchasedExtraBytes: number;        // total ever granted by settled storage packs
  estimatedMonthlyCostMinor: number;  // approximation — storage only, no Class A/B ops modelled
  costCurrency: string;
}

// ---------- Notifications ----------
export type BillingNotificationType =
  | 'BILLING_EXPIRING'
  | 'BILLING_PAST_DUE'
  | 'BILLING_PURGE_WARNING'
  | 'REFUND_APPROVED'
  | 'REFUND_REJECTED';
```

**Every `*AmountMinor` and `*Bytes` field is an integer in minor units / raw bytes.** Format at the
edge; never store a divided value.

---

## 15. Dev and staging behave differently

The provider is configurable (`app.billing.provider`). Unless an environment is explicitly set to
`STRIPE`, it runs the **manual** provider, and the difference is visible to the FE:

| | `MANUAL` (default: dev, staging) | `STRIPE` (production) |
|---|---|---|
| `redirectUrl` | points straight back at `/events/{id}/checkout/success` | a real `checkout.stripe.com` URL |
| when the event activates | **only when an admin settles the order** | a second or two after the hosted page |
| refund approval | `providerRefunded: false` — no charge exists to reverse | `true` on success |

So on a dev environment the host "pays", lands on the success page, and the event stays `DRAFT` until
someone calls `POST /api/admin/orders/{orderId}/settle`. **That is not a bug** — it is exactly why
the success page must be a polling/pending state rather than an assertion that the payment worked.
Keep the `orderId` visible in dev builds so testers can settle their own orders.

---

## 16. Screens to build

**Host**

- Pricing / plan picker at event creation — `EVENT`-scope catalog, `sortOrder`, unlimited handling.
- Draft event view — clearly "not published yet", with the `endAt` gate explained before the pay
  button. Include the "keep originals" toggle here (§7a) and the module-unlock picker (§7c) — both
  are only offered while `DRAFT`, and the running total should reflect them before the host pays.
- A storage-pack purchase UI on the plan-settings page (§7b) — pack picker + checkout button,
  rendering the raised ceiling on the usage bar once it settles.
- Checkout success (polling, never asserting) and cancelled routes.
- `/events/{id}/settings/plan` — **required**; the destination of every billing notification and
  email. Coverage, subscription, order history, renewal button, refund section.
- Frozen and purged banners, guest variants without the payment CTA.
- Refund request dialog stating the event returns to `DRAFT`, plus the under-review and decision
  panels.

**Admin**

- Plan catalog CRUD, with archive preferred over delete.
- Paid-services catalog CRUD (§13) — same archive-first pattern, one screen covering the add-on,
  every storage pack, and every module unlock, filterable by `kind`. The `grantsStorageBytes` and
  `grantsModuleKey` fields appear and disappear with `kind`; drive the module picker from the
  registry, not a literal list.
- Plan assignment for events, showing the returned usage snapshot. There is no working
  user/account-plan assignment control to build — that request always rejects (§13, Assignment).
- Manual order settlement, and the unprocessed-webhook list.
- Freeze / purge with a confirmation dialog that names the event.
- Refund queue — evidence-first per §9, note fields labelled as host-visible, and a visible warning
  wherever `providerRefunded` is false.
- Platform module registry toggles.

**Global**

- `429` handling in the API client (§11), including refresh deduplication.
- `5016 EVENT_FROZEN` handled once in the error interceptor.
- The five billing notification types in the feed.

---

## 17. Not built — do not design against these

- **Resuming a cancelled subscription.** Cancelling is one-way (§7). Undoing it means a new
  `subscription-checkout` and a new subscription, so there is no "keep it after all" button to build
  against a `cancelAtPeriodEnd: true` row.
- **Invoices and receipts.** `orders` carries what was charged and when, and nothing else. No PDF, no
  invoice number, no billing address — the provider's own emails are the receipt.
- **Changing an event's plan as a host.** Only admins can move an event between plans. No host-facing
  upgrade/downgrade flow exists.
- **Partial refunds.** All-or-nothing on the activation order.
- **Refunding a renewal, an upgrade, or a storage pack.** Only `ACTIVATION` orders are refundable.
- **Downsizing storage.** A purchased storage pack never expires and cannot be sold back — the
  ceiling only ever goes up.
- **Opting into the "keep originals" add-on after activation.** DRAFT-only (§7a); there is no
  "add originals to an existing event" flow, because it would leave earlier photos without one.
- **Buying a module unlock for a live event.** DRAFT-only for the same structural reason (§7c) —
  a mid-cycle unlock means charging mid-cycle, which only storage packs do. Don't put a buy button
  on a locked module on a live event; the only route open there is an admin plan upgrade.
- **Withdrawing a refund request.** A host cannot cancel a pending request; an admin has to reject
  it.
- **A host-visible refund SLA.** There is no "we respond within N days" value to display, and nothing
  surfaces the queue's depth.

Say so if the plan or refund screens need any of these. They are additions, not oversights.
