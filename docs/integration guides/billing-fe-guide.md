# FE integration guide: plans, payments, refunds

**The complete, current reference for the commercial side of the platform.** Everything a frontend
needs to sell an event and give money back. Current as of 2026-09-24.

**2026-09-24 — coverage extensions (plan coverage options phase 2), breaking:** `termsVersion` is
now `2026-09-25`; a client still sending `2026-09-24` gets `400` 5072. A primary host can buy more
coverage for a live event: `GET /api/events/{id}/extension-options` and `POST
/api/events/{id}/extension-checkout` (§7e). Orders gain the kind `EXTENSION`, price items the code
`COVERAGE_EXTENSION`, and every billing order gains `coverageStartsAt`/`coverageEndsAt`. An extension is
withdrawn alone through the one-order withdrawal endpoints (§9). The coverage-ending notification
gains an "Extend coverage" CTA. §7e, §9 and §12 are updated in place.
**`coverage-options-and-extensions-fe-integration.md` §11 has the full reference.**

**2026-09-24 — price breakdown, legal texts, emails (phase 4), breaking:** `termsVersion` is now
`2026-09-24`; a client still sending `2026-09-17` gets `400` 5072. Every price is itemised: the
checkout response, each billing order, both code previews and each upgrade option gain `breakdown`
(a `PriceBreakdown`), and the new `POST /api/events/{id}/quote` prices an activation or storage pack
before checkout. The Stripe page shows one line per item and a localized footer. The withdrawal
information and model form are served from `GET /api/legal/withdrawal-terms[/{version}]`, and the
host is emailed a payment confirmation and a withdrawal acknowledgement. §6, §7a, §7b, §7d, §8, §9
and §14 are updated in place.
**`withdrawal-compliance-phase4-fe-integration.md` has the full reference.**

**2026-09-24 — business buyers (phase 3), breaking:** An account with a VIES-confirmed EU VAT
number buys as a business. Its checkouts may omit the two consent booleans, its purchases have no
consumer right of withdrawal, and `buyerType` appears on checkout responses, orders and withdrawal
lines. EVENT withdrawals list the business orders they leave unrefunded in `excludedOrders`. §6, §7b,
§7d, §8, §9, §12 and §14 are updated in place.
**`business-buyers-fe-integration.md` has the full reference.**

**2026-09-23 — breaking:** One upgrade or one storage pack can be withdrawn on its own, and the
event stays. Storage packs can now be withdrawn at all, so their checkout needs the same consent as
activation. The admin "withhold" is gone: a held withdrawal is released, optionally keeping the
event day. A pack or upgrade checkout is refused while a withdrawal it would miss is under review
(`409` 5084). §7b, §7d, §8, §9, §10, §12, §13 and §14 are updated in place.
**`withdrawal-compliance-phase2-fe-integration.md` has the full reference.**

**2026-09-23 — breaking:** The "keep originals" add-on is retired. Every plan already kept
originals, so `ORIGINALS` is no longer sold: it is gone from `paidServices`, the add-on opt-in
refuses it (`409` 5036), and `PATCH /api/events/{id}` refuses `keepOriginals` (`400` 3002). Drafts
that had opted in are no longer charged for it. §7, §7a, §7b, §7c, §8, §16 and §17 are updated in
place; §7a has the table of what changed.

**2026-09-23 — breaking:** EVENT plans are sold at several durations, each with its own price. An
EVENT plan's `priceAmountMinor` is now always `null` and `autoDeleteMonths` is gone: the prices, and
the months of coverage each one buys, are in the plan's new `initialOptions`. `POST /api/events`
needs a `coverageOptionId`, and the upgrade picker and upgrade checkout work per duration. §2, §6,
§7a, §7d, §8, §12, §13, §14 and §16 are updated in place.
**`coverage-options-and-extensions-fe-integration.md` has the full reference.**

**2026-09-04:** Notification `ctaRoute` (a literal path the backend guessed at) is gone, replaced by
`ctaTarget` + `ctaParams` — you resolve the route yourself (§10). This affects every notification
with a CTA, not just billing ones. **`notification-cta-target-fe-integration.md` has the full
reference.**

**2026-09-02:** Hosts can delete an event — `POST`/`DELETE /api/events/{eventId}/deletion-requests`,
primary-host-only, password-confirmed, undoable for 30 days (§5). The old any-host, no-confirmation
`DELETE /api/events/{id}` is gone. **`event-deletion-fe-integration.md` has the full reference.**

**2026-08-26:** The monthly "preservation" subscription is gone — **every purchase on this platform
is now one-time.** An event, once activated, stays `ACTIVE` indefinitely; there is no coverage window,
no dunning, no freeze, no purge. `FROZEN` and `PURGED` are deleted from `EventStatus` (§5), the
`recurringPriceAmountMinor` and `includedMonths` plan fields are gone (§2), and every paid service —
the "keep originals" add-on, storage packs, module unlocks alike — is billed exactly once, never
again (§7). `POST /api/events/{eventId}/subscription-checkout`, `DELETE
/api/events/{eventId}/subscription`, and the admin freeze/purge endpoints no longer exist. This doc
is updated in place, throughout — there is no separate delta doc for this one, the change is too
broad to summarize as a diff. If you built against the old model, re-read §1, §5, §7, §8, §12 and §14
in full rather than skimming for what moved.

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
7. [One-time extras](#7-one-time-extras)
7a. [The "keep originals" add-on](#7a-the-keep-originals-add-on)
7b. [Storage packs](#7b-storage-packs)
7c. [Module unlocks](#7c-module-unlocks)
7d. [Upgrading plan tier](#7d-upgrading-plan-tier)
7e. [Coverage extensions](#7e-coverage-extensions)
8. [The billing read endpoint](#8-the-billing-read-endpoint)
9. [Withdrawal](#9-withdrawal)
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

**Every purchase on this platform is one-time.** There is no subscription, no recurring charge, no
card held on file, no coverage window that lapses. Once `ACTIVE`, an event stays `ACTIVE` — its media,
posts and RSVPs are live indefinitely, for as long as the account exists. Four things can be bought,
each its own checkout:

| purchase | what it buys | when | order kind |
|---|---|---|---|
| **Activation** (§6) | the event goes live, permanently | before the event, once, `DRAFT` only | `ACTIVATION` |
| **Upgrade** (§7d) | moves an already-`ACTIVE` event onto a higher plan tier, at a duration at least as long as its own | any time after activation | `UPGRADE` |
| **Storage pack** (§7b) | permanently raises the storage ceiling | any time after activation | `STORAGE_PACK` |
| **Module unlock** (§7c) | entitlements folded into the activation charge | before activation, `DRAFT` only | *(no order of its own)* |

"Keep originals" is no longer something to buy: every plan includes it (§7a).

**Nothing is ever auto-charged.** Every one of the four rows above is something the host explicitly
clicks a button for. There is no dunning, no freeze, no purge — an event that "just sits there" costs
the host nothing further and loses nothing.

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

  "priceAmountMinor": null,           // always null on an EVENT plan — the prices are in initialOptions
  "priceCurrency": "EUR",             // uppercase ISO 4217; also the currency of every option below
  "billingPeriod": "ONE_TIME",        // always ONE_TIME on an EVENT-scope plan

  "discountPercent": null,
  "discountLabel": null,
  "discountStartsAt": null,
  "discountEndsAt": null,

  "moduleKeys": ["gallery", "posts", "rsvp"],
  "eventTypeKey": "WEDDING",     // the one event type this plan may be bought for — see below
  "sharedGroupKey": null,        // set only if this plan was created via the admin "duplicate" action
  "paidModules": [],             // MODULE_UNLOCK upsells for this plan — see §4
  "initialOptions": [            // the durations it is sold at; the host picks one (2026-09-23)
    { "id": "8f1c…", "kind": "INITIAL", "months": 6,  "priceAmountMinor": 10000, "sortOrder": 0, "active": true },
    { "id": "2a77…", "kind": "INITIAL", "months": 12, "priceAmountMinor": 14000, "sortOrder": 1, "active": true }
  ],
  "extensionOptions": []         // coverage bought after activation — sold since 2026-09-24 (§7e)
}
```

### Rendering rules

- **All amounts are minor units** (cents). Divide by 100 for EUR — do not hardcode two decimals if
  you ever add a currency that does not use them.
- **An EVENT plan is priced per duration (2026-09-23).** Each `initialOptions` entry is a length of
  coverage and its price, charged exactly once, at activation; the plan's own `priceAmountMinor` is
  always `null`. There is no recurring price on a plan tier. A pricing card leads with the cheapest
  option ("from €100"); the creation form lists them all.
- Suggested copy: *"€100 once for 6 months of coverage — no renewal, ever"*.
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

### Coverage — how long an event's content is kept

Set by the **coverage option** the host picks (2026-09-23), not by the plan: the option's `months`
count from the event's date. The event is soft-deleted at its `coverageEndsAt` (pinned at activation;
see the coverage-window FE guide) — the exact same lifecycle as a host-requested deletion (§ the
delete-event flow): undoable while soft-deleted, hard-purged after `app.billing.event-retention-days`.
The plan-level `autoDeleteMonths` this section used to describe is gone.

The host gets two warning notifications before it happens — 7 days out and 1 day out — carrying
`NotificationType: 'EVENT_AUTO_DELETE_WARNING'`, so this is not a silent deletion. Render each option
on a pricing page as e.g. *"Photos kept for 6 months after your event"*.

### `code` is not a fixed union

Admins create plans at runtime, so `code` is **not** limited to `'FREE' | 'PLUS' | 'PRO'`. Any
`type PlanTier = …` union, exhaustive switch, or hardcoded array of tier names must widen to `string`
and read the actual set from `planTiers`. `code` is unique **per scope**, not globally — an `EVENT`
plan and an `ACCOUNT` plan can both legitimately be called `FREE`.

`GET /api/events/{id}/usage` returns `planTier` as a plain string for the same reason. The wire
value never changed; only the declared type widened.

### `eventTypeKey` / `sharedGroupKey` — one plan, one event type

> **Superseded the plural `eventTypeKeys: string[]` restriction-set model on 2026-09-13.** If you
> see `eventTypeKeys` (plural) anywhere outside this note — an old cached response, a stale local
> type — it's wrong; `PUT /api/admin/plan-tiers/{id}/event-types` no longer exists. Full detail:
> [`plan-tiers-by-event-type-fe-integration.md`](plan-tiers-by-event-type-fe-integration.md).

Every `EVENT`-scope plan belongs to **exactly one** `eventTypeKey` (required, never null) — there is
no restriction set any more. This is how "Basic" can mean something different — different price,
different `moduleKeys`, a different set of `paidModules` — for a birthday than for a wedding: they
are simply two different `PlanTier` rows, each pinned to its own type, that happen to share a `name`.
Nothing enforces uniqueness on `name`, only on `code` (and only per scope, per §2's "`code` is not a
fixed union" above). `ACCOUNT`-scope plans have no event type (`eventTypeKey: null`).

`sharedGroupKey` (nullable UUID) links plans created together via the admin "duplicate" action
(`POST /api/admin/plan-tiers/{id}/duplicate`) — e.g. Wedding Basic duplicated into Corporate Basic
and Conference Basic all share one key, so a landing page can group them as "the same offer" across
types instead of rendering unrelated-looking rows. `null` for a plan never duplicated or duplicated
from.

### `GET /api/plan-tiers?eventType=WEDDING`

Authenticated (any logged-in user — not `permitAll`, unlike `GET /api/config` which is public).
Returns the `EVENT`-scope, assignable, public plans whose `eventTypeKey` matches. Accepts multiple
`eventType` values in one call (union across all of them) — for a landing page showing several
types together, grouped by `sharedGroupKey`. Same `PlanTierResponseDto` shape as `GET /api/config`'s
`planTiers`, `paidModules` included.

```
GET /api/plan-tiers?eventType=WEDDING
→ 200
[
  { "code": "BASIC", "scope": "EVENT", "eventTypeKey": "WEDDING", "sharedGroupKey": null, "moduleKeys": [...], "paidModules": [...] },
  { "code": "PLUS",  "scope": "EVENT", "eventTypeKey": "WEDDING", "sharedGroupKey": null, "moduleKeys": [...], "paidModules": [...] }
]
```

An unknown `eventType` → `400` / `errorCode: 3018 INVALID_EVENT_TYPE` — the same error event
creation uses (`GET /api/config`'s `eventTypeKeys` array is the source of truth for what's valid).

**Use this for the plan-picker step of event creation, once the host has already chosen a type** —
each plan's `initialOptions` are the durations the host picks between in the same step. It
is a strict subset of the full catalog — every plan it returns also appears in `GET /api/config`,
just possibly filtered out there if it's a different type. Building a birthday-only catalog or a
wedding-only catalog is then just: two different `PlanTier` rows with the same `name` ("Basic"),
different `code`s, different `eventTypeKey`s. The FE never needs to know two rows share a display
name — it just renders whatever this endpoint returns for the selected type. See
[`plan-tiers-by-event-type-fe-integration.md`](plan-tiers-by-event-type-fe-integration.md) §5 for the
admin `duplicate` endpoint that creates these grouped rows.

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
DRAFT ──(activation paid)──► ACTIVE
   ▲                            │
   └────(refund approved)───────┘
```

That's the whole lifecycle. `FROZEN` and `PURGED` do not exist — there is nothing left to lapse into
them, since activation no longer buys a coverage window that can run out. `status` is on both
`EventResponse` and `EventDetailResponse`.

| status | reads | writes | guests | notes |
|---|---|---|---|---|
| `DRAFT` | hosts only | hosts only | **cannot join or be invited** | not in listings for anyone else |
| `ACTIVE` | yes | yes | yes | the normal, permanent state once paid for |

One thing worth internalising: **an approved refund returns an `ACTIVE` event to `DRAFT`** — the one
backwards transition, and it is about a refund decision, never about non-payment (there is nothing to
under-pay any more). See §9.

If your code still branches on `'FROZEN'` or `'PURGED'` — a read-only banner, a purge-warning screen,
an `EVENT_FROZEN` error handler — delete it. `EventStatus` is a two-value union now (§14) and a `409`
from a write is never about the event's own lapsed payment status any more.

**Orthogonal to `status`: an event can now also be pending deletion.** `deletionScheduledFor`
(non-null = a deletion request is pending, purged permanently on that date) is set by the primary
host via `POST /api/events/{eventId}/deletion-requests` and cleared by any host via `DELETE` on the
same path — undoable up until the purge date. A pending-deletion event 404s from every read for
non-hosts; its hosts can still read everything (detail, billing, gallery, wishbook) but write
nothing. See `soft-deleted-events-fe-integration.md` for the full read/write contract.

---

## 6. Activation: the first purchase

```
1. POST /api/events                      → 201, status: "DRAFT"   (plan and duration chosen here)
2. host fills in details, incl. endAt    → PATCH /api/events/{id}  (duration still switchable)
3. POST /api/events/{id}/checkout        → 200 { orderId, redirectUrl, buyerType, breakdown }
4. window.location.href = redirectUrl    → the provider's hosted page (we never see the card)
5. provider redirects back to
   /events/{id}/checkout/success|cancelled
6. poll GET /api/events/{id}/billing until the order is PAID
```

### Step 1 — creating the draft

`planTierCode` is required on `POST /api/events` and must be a `code` from the `EVENT`-scope catalog.
So is `coverageOptionId` (2026-09-23): the `id` of one of that plan's `initialOptions`, the duration
being bought. A missing, retired or other plan's option → `400 COVERAGE_OPTION_INVALID` (5077). Until
it is paid for, a draft can switch to another of its plan's durations with `PATCH /api/events/{id}`.
An archived or non-public plan → `409 PLAN_TIER_NOT_PURCHASABLE`. A plan whose `eventTypeKey` (§2)
doesn't match the request's `eventType` → `409 PLAN_TIER_NOT_AVAILABLE_FOR_EVENT_TYPE`
(5053) — this is a server-side backstop for a stale client, not the primary UX; source the plan list
from `GET /api/plan-tiers?eventType=X` (§2) so a mismatched plan is never offered for the wrong type
in the first place.

Drafts are the host's private workspace: excluded from `GET /api/events` for everybody else, guests
cannot be invited, every module reports unavailable. Show them in a clearly separate "not published
yet" section rather than mixed into the event list.

### Step 2 — `startAt` and `endAt` are both required at checkout

Both are required from creation onward, and `endAt` must be after `startAt`. Rejected with `400
EVENT_DATES_INCOMPLETE`:

- `startAt` missing
- `endAt` missing
- `endAt <= startAt` (also enforced on `PATCH /api/events/{id}`)

Gate the "Pay and publish" button on both dates being set and `endAt` being after `startAt`, and
explain why — otherwise the 400 arrives at the worst possible moment.

### Step 3 — opening checkout

```http
POST /api/events/{eventId}/checkout
Authorization: Bearer <jwt>
Content-Type: application/json

{
  "collaborationCode": "BARNVENUE",              // optional, max 40 chars
  "requestsImmediateStart": true,                // a consumer: required, must be true
  "acknowledgesWithdrawalTerms": true,            // a consumer: required, must be true
  "termsVersion": "2026-09-25"                    // required — from GET /api/config's withdrawal.termsVersion
}
```

A buyer whose `GET /api/me/business-profile` says `business: true` may omit both booleans (§9,
Business buyers). For a consumer, missing or false is still `400 VALIDATION_FAILED` (3001), now
without per-field `errors`, and it comes after the 4006 and 5072 checks.

**A body is required as of 2026-09.** `requestsImmediateStart` and `acknowledgesWithdrawalTerms` are
the express request and acknowledgement Directive 2011/83/EU art. 14(3)/(4)(a) require before a paid
service may begin inside the statutory withdrawal window — for a consumer, both must be sent as
`true` or the request is rejected with `400 VALIDATION_FAILED`. `termsVersion` ties the acknowledgement to the wording the
host actually saw; source it from `GET /api/config`'s `withdrawal.termsVersion` (§14) and show that
wording (or a link to it) before the host confirms. Primary host only: a co-host gets `403`
`PURCHASE_NOT_PRIMARY_HOST` (4006). Rate limited to 10/min.

**A stale `termsVersion` is refused, not silently accepted.** If the terms changed since the client
last fetched `/api/config` (e.g. a long-lived tab), the server answers `400
WITHDRAWAL_TERMS_VERSION_STALE` (5072) naming the version now in force. Reload `/api/config` and
re-show the current wording before letting the host retry — do not silently resubmit with the old
version, and do not loop.

```jsonc
// 200
{
  "orderId": "1f3c…",     // our order id — worth logging for support
  "redirectUrl": "https://checkout.stripe.com/c/pay/cs_test_…",
  "buyerType": "CONSUMER", // or "BUSINESS" — added 2026-09-24; what this order is sold as
  "breakdown": {           // added 2026-09-24 (phase 4): the order's pinned PriceBreakdown, never null here
    "kind": "ACTIVATION", "currency": "EUR", "buyerType": "CONSUMER",
    "coverage": { "optionId": "2a77…", "months": 12, "monthsAdded": null,
                  "endsAt": "2027-12-05T18:00:00Z", "endsAtProjected": true },
    "items": [
      { "code": "ACTIVATION", "labelKey": "billing.item.activation", "name": "Plus",
        "listMinor": 500, "discountMinor": 100, "priceMinor": 400, "withdrawal": "RETAINED_ONCE_STARTED",
        "performedAt": null, "months": null, "monthsAdded": null,
        "paidServiceCode": null, "planTierCode": "PLUS", "storageBytes": null },
      { "code": "EVENT_DAY", "labelKey": "billing.item.eventDay", "name": "Plus",
        "listMinor": 6000, "discountMinor": 1200, "priceMinor": 4800, "withdrawal": "RETAINED_ONCE_PERFORMED",
        "performedAt": "2026-12-05T18:00:00Z", /* … */ },
      { "code": "COVERAGE", "labelKey": "billing.item.coverage", "name": "Plus",
        "listMinor": 3500, "discountMinor": 700, "priceMinor": 2800, "withdrawal": "PRO_RATA_BY_TIME",
        "months": 12, /* … */ },
      { "code": "ADDON", "labelKey": "billing.item.addon", "name": "Gift Wishlist",
        "listMinor": 300, "discountMinor": 0, "priceMinor": 300, "withdrawal": "RETAINED_ONCE_PERFORMED",
        "paidServiceCode": "UNLOCK_WISHLIST", /* … */ }
    ],
    "discounts": [ { "source": "PLAN_PROMOTION", "label": "Launch offer", "percent": 10 },
                   { "source": "CODE", "label": "Barn Venue partner rate", "percent": 10 } ],
    "combinedDiscountPercent": 20, "discountCapPercent": 30, "capApplied": false,
    "listTotalMinor": 10300, "discountTotalMinor": 2000, "totalMinor": 8300,
    "vat": { "included": true, "note": "billing.vat.included" },
    "termsVersion": "2026-09-25",
    "withdrawal": { "available": true, "windowDays": 14, "windowClosesAt": null }
  }
}
```

**Show `breakdown` on the review page (2026-09-24).** It is what the order stores and what the Stripe
page lists, item by item, so render it rather than any earlier figure. Before checkout is opened,
`POST /api/events/{eventId}/quote` (`{ "kind": "ACTIVATION" }`) returns the same shape for the draft,
including a code it has already redeemed. **An open checkout keeps its first price** until its session
expires (24 h): a plan repriced meanwhile doesn't change it, and the quote returns that open order's
pinned breakdown whenever checkout would hand the order back. Changing what is bought (the duration,
an add-on, a newly redeemed code, the event date, the buyer) still replaces the order. Every field, the label keys and the
quote's errors are in
[withdrawal-compliance-phase4-fe-integration.md](withdrawal-compliance-phase4-fe-integration.md).

Then `window.location.href = redirectUrl`. **Do not open it in an iframe or a popup** — the hosted
page sets frame-ancestor headers, and 3DS/SCA needs a real top-level navigation.

Calling it twice (with the same consent) is safe: our order id is also the provider's idempotency
key, so a retry returns the same session rather than opening a second one. Still disable the button
while the request is in flight.

**It charges the draft's duration (2026-09-23).** The amount is the chosen coverage option's price,
after the plan's promotion and any code. If that duration was retired after the host picked it, the
call answers `409 COVERAGE_OPTION_UNAVAILABLE` (5078) and nothing is charged: send the host back to
pick another (`PATCH /api/events/{id}` with a new `coverageOptionId`) and retry. Switching the
duration after opening checkout cancels the open order on the next call and issues a re-priced one,
exactly as opting into an add-on does (§7a).

**Tax is not handled by this platform today — flag before launch, not FE work by itself.** Automatic
VAT/sales tax (Stripe Tax) is off by default (`BillingProperties.automaticTax`); switching it on is a
backend + Stripe-account config change (jurisdictions must be registered on the Stripe account first),
not something the FE can turn on. Turning it on also makes Stripe collect a billing address on the
hosted page, which changes that page's shape but not anything the FE calls. If this becomes a
compliance requirement for the markets you launch into, it needs a product decision and backend work
before FE has anything to build against; this note exists so it isn't discovered at launch.

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
// Poll the billing endpoint and watch your own order, not the event status: an UPGRADE or
// STORAGE_PACK order settling never changes the event's status, only ACTIVATION does.
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

## 7. One-time extras

Beyond activation itself, there are three more things a host can buy — none of them recurring, none
of them auto-renewing. They fall into two shapes:

| shape | when it's bought | how it's charged | covers |
|---|---|---|---|
| **Folds into activation** | `DRAFT` only, before paying | added into the activation order's total — no checkout of its own | §7c module unlocks (§7a has how it is billed) |
| **Its own checkout** | `ACTIVE` only, any time after | a standalone order, paid immediately | §7b storage packs, §7d plan upgrades |

"Keep originals" used to be a fourth. It is included in every plan now and no longer sold (§7a).

The split exists because a `DRAFT` event hasn't paid anything yet — there's no live order to add a
charge to — while an `ACTIVE` event already has, so a later purchase has to be its own transaction.
Nothing here is ever billed twice or billed again: every one of the three is a single charge, once.

---

## 7a. The "keep originals" add-on

**Retired 2026-09-23: every plan keeps originals.** There is nothing to buy and nothing to toggle.

Every event stores the untouched original of each photo alongside the compressed display copy. The
backend has done this for every event since 2026-08-26. Until V100, though, the `ORIGINALS` add-on
was still on sale for €5, so a host could pay for something they already had. It is no longer sold:

| where | before | now |
|---|---|---|
| `GET /api/config` → `paidServices` | listed `ORIGINALS` (`RECURRING_ADDON`, 500) | not listed: the row is archived (`isAssignable=false`, `isPublic=false`) |
| `POST /api/events/{id}/addons` with `ORIGINALS` | created the entitlement, +500 on activation | `409 PAID_SERVICE_NOT_PURCHASABLE` (5036), even if an admin re-enables the row |
| `PATCH /api/events/{id}` with `keepOriginals` | opted the draft in | `400 MALFORMED_REQUEST_BODY` (3002): the field is gone, and unknown fields are refused |
| a draft that had opted in | billed 500 at activation | V100 removed its entitlement, so activation no longer includes it |
| a paid event that bought it | — | keeps its `ORIGINALS` row in `addons[]` and its order's `addonAmountMinor`, as the record of what it paid |

**What to change on the frontend:**

- Remove any "keep originals" toggle or offer, and drop `keepOriginals` from your `PATCH` body type.
  Sending it is now a `400`.
- Don't gate original downloads on the event having bought `ORIGINALS`. Every event has originals;
  see [Retrieving the original](#retrieving-the-original).
- Don't add the `ORIGINALS` price into any client-side total. Read totals from the order.

Originals count toward the event's storage quota, so every event now uses more of its quota than
the display copies alone would.

If a host opened an activation checkout before the change, that order was priced with the add-on.
Their next `POST /api/events/{id}/checkout` sees that the add-on total changed. It cancels the old
order and issues a new one without the add-on. The one gap: a provider session opened before the
deploy can still be paid at the old price until it expires (24 h).

### Getting back out — admin only

```http
DELETE /api/admin/events/{eventId}/addons/{paidServiceCode}
```

**There is no host-facing way to remove an entitlement**, and no admin-facing way either once the
event is `ACTIVE`. Once paid for, an entitlement (a §7c unlock or a §7b storage pack, same endpoint,
same rule) is permanent for the life of the event: `409 ADDON_LOCKED_WHILE_ACTIVE` (5042). This
endpoint only succeeds on an event that isn't `ACTIVE`, such as a still-`DRAFT` event. It is an
admin correction tool, not something used on a live, paying event. `409 ADDON_NOT_ACTIVE` (5041) if
the event has no such entitlement to begin with.

### Opt-ins are billed once, folded into the activation charge

An opted-in extra is **never free, and never billed again**. Its price is added straight into the
activation order's total:

```
activation amount = coverage option's price + Σ(active opt-ins' price)   // §7c module unlocks
```

**`billingPeriod` is always `'ONE_TIME'` on every paid service, regardless of `kind`.** The field
still exists on the DTO (it is retained on `PlanTierResponse` for `ACCOUNT`-scope plans), but the
catalog no longer accepts anything else here — the admin create/patch endpoint rejects `MONTHLY` or
`YEARLY` on a `paid_services` row outright (§13). If your code still branches on this field to decide
"folds into a renewal" vs. "one-time", delete the branch: there is no renewal to fold into any more.

So opting in before paying adds the unlock's flat price to the activation total, once. **Show this
in the plan picker**. The toggle changes the price on the "Pay and publish" button, and a host who
sees the number move only at the payment step will read it as a surprise charge.

The `ACTIVATION` order carries the breakdown in `addonAmountMinor`, the summed price of every opt-in
folded into that one charge:

```jsonc
{ "id": "…", "kind": "ACTIVATION", "status": "PAID",
  "amountMinor": 10300,       // option 10000 + unlock 300
  "addonAmountMinor": 300,    // null when nothing is opted in — the receipt line for it
  "currency": "EUR", … }
```

Render *"€100 activation + €3 wishlist = €103"* from `amountMinor` and `addonAmountMinor` rather
than re-deriving it from the catalog. The order is the historical receipt, and the catalog price may
have changed since. An order paid before 2026-09-23 may still include 500 for `ORIGINALS`.
Since 2026-09-24 the order's `breakdown` (§8) lists each add-on as its own `ADDON` item, never
discounted; prefer it where it isn't `null` (it is on orders from before then).

**If the host opts in after opening checkout**, the open order is cancelled and a re-priced one is
issued: the `orderId` (and redirect URL) you were holding changes. Re-read the order from the
checkout response rather than reusing a cached one after any opt-in (§7c).

### Retrieving the original

```http
GET /api/medias/{id}/original   → 200 { url: "https://…" }   # presigned, short-lived
```

**Host or the uploading member only**: `403` for anyone else, including other guests. `404` if
that item has no original on file. That happens only for media uploaded before 2026-08-26 to an
event that never bought the add-on. This is a separate call from the normal feed URL: the feed always
serves the small derivative, and this is the only way to reach the full-resolution file.

Offer it on every event. The billing `addons` array says nothing about whether originals exist.

For bulk retrieval of the whole gallery at once (not one item at a time), see
[`gallery-archive-download-fe-integration.md`](gallery-archive-download-fe-integration.md), the
host-only zip-download feature. It offers the `ORIGINAL` variant on every event: the manifest's
`originalsAvailable` is always `true`.

### What the billing read endpoint adds

`GET /api/events/{eventId}/billing` (§8) has an `addons` array:

```jsonc
{
  …,
  "addons": [
    { "code": "UNLOCK_WISHLIST", "name": "Gift Wishlist", "priceAmountMinor": 300,
      "billingPeriod": "ONE_TIME", "activatedAt": "2026-08-01T10:00:00Z" }
  ]
}
```

Every row is `'ONE_TIME'`. It was paid for once at activation and owes nothing further; it appears
here because the host owns it, not because they owe on it. `priceAmountMinor` is what it cost at the
time, not a recurring figure. Empty array on an event that never opted in. An event paid before
2026-09-23 may also list `ORIGINALS`; show it as history, and gate nothing on it. The `ACTIVATION`
order separately carries its own `addonAmountMinor`: the combined total of the opt-ins in this array,
per the receipt note above. Storage packs (§7b) are in the array too but were paid by their own order.

---

## 7b. Storage packs

A one-time checkout that **permanently raises** an event's storage ceiling — the byte grant never
expires and is never refunded, and the price is a single flat charge, never repeated. A host who buys
+50 GB pays once for that ceiling, the same way activation is paid once for the event going live.

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
  "billingPeriod": "ONE_TIME",
  "grantsStorageBytes": 5368709120
}
```

### Buying one — `ACTIVE` only, its own checkout

```http
POST /api/events/{eventId}/storage-checkout
{ "paidServiceCode": "STORAGE_5GB", "requestsImmediateStart": true,
  "acknowledgesWithdrawalTerms": true, "termsVersion": "2026-09-25" }
```

**Consent is required since 2026-09-23**, with the same fields and rules as §6: a pack can be
withdrawn (§9), so the host must ask for it to start at once. A business buyer may omit it (§6). See [withdrawal-compliance-phase2-fe-integration.md](withdrawal-compliance-phase2-fe-integration.md) §1.
While a withdrawal of the whole event is `HELD`, a pack checkout is `409 PURCHASE_WITHDRAWAL_OPEN`
(5084): that release deletes the event, and a pack bought meanwhile would be left paid for on it
([withdrawal-compliance-phase2-fe-integration.md](withdrawal-compliance-phase2-fe-integration.md) §9).

Primary host only (4006 for a co-host), rate limited 10/min (shared bucket with the other checkout endpoints), same response
shape and same two return routes as activation (§6 steps 3–5) — poll `GET /api/events/{id}/billing`
and watch the order, exactly the same way. Its `breakdown` has one `STORAGE_PACK` item; to show it
before checkout, `POST /api/events/{eventId}/quote` with `{ "kind": "STORAGE_PACK", "paidServiceCode":
"STORAGE_5GB" }` (2026-09-24). **`ACTIVE`-only**: `409 EVENT_NOT_ACTIVE` (5014) on a
`DRAFT` event — there's nothing to raise the ceiling of before it's paid for at all; offer a pack only
after activation, never in the setup wizard alongside §7a/§7c's DRAFT-only toggles.

**The body names a catalog code, nothing else** — price and byte grant both come from that row
server-side, so a tampered body can at worst name a code that doesn't exist at all
(`404 RESOURCE_NOT_FOUND`, 2001), a real code that's archived or not public
(`409 PAID_SERVICE_NOT_PURCHASABLE`, 5036), or the wrong kind, e.g. an unlock code sent
here instead of §7c's endpoint (`400 INVALID_PAID_SERVICE_KIND`, 3015). Buying a pack the event
already holds → `409 ADDON_ALREADY_ACTIVE` (5038) — each pack code is one-and-done per event; offer a
different pack, not the same one again.

Buying two different packs in quick succession opens two independent orders — each pack gets its
own concurrency slot, so a second pack never silently reuses the first one's checkout session.

### What it changes

Once the order settles, the event's effective storage ceiling rises immediately and stays raised
until the pack is withdrawn or lost to a chargeback (below). `GET /api/events/{eventId}/usage` (§3) now separates the plan's own limit from purchased
extra:

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

A settled pack also shows up in §7a's `addons` array on `GET /api/events/{eventId}/billing`, same as
a §7c unlock — it appears there because the host owns it, not because anything is owed on it.

**Storage packs are withdrawable since 2026-09-23.** A pack can be withdrawn on its own within 14
days of its payment (§9, "one order"). It is refunded at once, pro rata by time, its bytes come off
the limit, and the pack can be bought again. An event withdrawal refunds its packs with it. A lost
chargeback on a pack takes its bytes back too. Either way, if the event then holds more than its
new limit, the host has 7 days to download before the newest files above the limit are deleted
(`storageTrimDueAt` on §8's billing read, and two notifications in §10).

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
  "billingPeriod": "ONE_TIME",
  "grantsStorageBytes": null,        // always null for a MODULE_UNLOCK
  "grantsModuleKey": "wishlist"      // always set, and always a key from eventModuleKeys
}
```

Join `grantsModuleKey` against `GET /api/config` → `modules[]` for the module's display name and
description rather than reusing the service's own `name` — the registry row is what the rest of the
UI labels that module with, and the two drifting apart is confusing on the one screen that shows
both.

### Bought outright, once

A module unlock is charged exactly once, on the activation, and never again — `billingPeriod` is
always `'ONE_TIME'` here too (§7a's note applies equally). It is the one add-on charge that is not
tied to how long the event runs: the module itself is what's being sold, not time.

**Draft-only, and load-bearing.** The activation checkout is the only thing that ever charges it, so
there is no "add it later" flow to build and no endpoint to build it against —
`POST /api/events/{id}/addons` returns `409 EVENT_NOT_DRAFT` (5017) once the event is live. Surface
the unlock picker during setup, before the activation checkout, and treat the activation as the point
of no return for it. If the host wants the module afterwards, the answer is a plan upgrade (§7d), not
an unlock.

Re-reading `GET /api/events/{id}/billing` after activation shows the unlock in `addons[]` — that is
how the host sees what they own.

### Buying one — `DRAFT` only, and it is not a checkout

```http
POST /api/events/{eventId}/addons
{ "paidServiceCode": "UNLOCK_WISHLIST" }
```

Primary host only (4006 for a co-host), rate limited 30/min. Returns the same `AddonSummary` shape as the `addons` array in §8:

```jsonc
{ "code": "UNLOCK_WISHLIST", "name": "Gift Wishlist", "priceAmountMinor": 300,
  "billingPeriod": "ONE_TIME", "activatedAt": "…" }
```

**Nothing is charged at this moment.** The entitlement is the row this creates, and the price folds
into the activation payment, per §7a's formula. Render it as a
toggle in the draft setup flow next to the plan picker — **not** as a purchase button, and not on any
live-event screen.

The same endpoint also accepts `RECURRING_ADDON` codes. The default catalog sells none: `ORIGINALS`,
the only one, is retired and refused here with `409 PAID_SERVICE_NOT_PURCHASABLE` (5036) (§7a). A
`STORAGE_PACK` code sent here is a `400 INVALID_PAID_SERVICE_KIND` (3015) —
storage is bought against a *live* event through §7b.

| Status | Code | When | What to do |
|---|---|---|---|
| `409` | `EVENT_NOT_DRAFT` (5017) | the event is already live | see the limitation below — don't offer the control at all there |
| `409` | `ADDON_ALREADY_ACTIVE` (5038) | already opted in | treat as success and refetch |
| `400` | `INVALID_PAID_SERVICE_KIND` (3015) | a storage-pack code | refetch `paidServices` |
| `404` | `RESOURCE_NOT_FOUND` (2001) | no such code | refetch `paidServices` |
| `409` | `PAID_SERVICE_NOT_PURCHASABLE` (5036) | archived or non-public, or `ORIGINALS` | hide the offer |
| `409` | `PAID_SERVICE_NOT_ON_PLAN` (5040) | restricted to plans this event isn't on | filter the picker on `planTierIds` so this is unreachable |
| `403` | `FORBIDDEN` (4001) | caller isn't a host of the event | — |
| `403` | `PURCHASE_NOT_PRIMARY_HOST` (4006) | caller is a co-host, not the primary host | — |

### The limitation to design around

**There is no mid-cycle unlock-purchase path.** So the module picker belongs in the event setup
wizard, before activation; on a live event, a module the plan doesn't include renders unavailable
with **no buy-an-unlock affordance** — that call always `409`s.

The upgrade path still works as a way out: moving the event onto a plan whose `moduleKeys` include
the key opens it, because gate 2 is an OR (§4). Unlike the unlock itself, that route **is** available
on a live event — see §7d.

### Getting back out

There isn't a host-facing route, deliberately — same rule as §7a and §7b.
`DELETE /api/admin/events/{eventId}/addons/{code}` is admin-only and refuses on any `ACTIVE` event
(`409 ADDON_LOCKED_WHILE_ACTIVE`, 5042).

---

## 7d. Upgrading plan tier

*Previously undocumented — this endpoint already exists and is live.* Moves an already-`ACTIVE` event
onto a higher plan tier, mid-life, at one of that plan's durations, for the price of the difference —
the one purchase in §7 that isn't folded into activation and isn't a flat fixed price.

```http
POST /api/events/{eventId}/upgrade-checkout
{
  "planTierCode": "PRO",
  "coverageOptionId": "e9a0…",
  "requestsImmediateStart": true,
  "acknowledgesWithdrawalTerms": true,
  "termsVersion": "2026-09-25"
}
```

`coverageOptionId` (required since 2026-09-23) is one of the durations `upgrade-options` lists for
that plan. Same consent fields as activation, optional for a business buyer (§6 step 3) — an upgrade is a new paid service and the
withdrawal window reopens on it. Primary host only (4006 for a co-host, on `upgrade-options` too), same response shape (`{ orderId, redirectUrl, buyerType, breakdown }`) and same
two return routes as activation (§6 steps 3–5) — poll `GET /api/events/{id}/billing` and watch the
order, same as every other checkout here.

**`ACTIVE`-only.** A `DRAFT` event hasn't paid anything yet, so there's no "upgrade" to speak of —
`409 EVENT_NOT_ACTIVE` (5014); use activation (§6) instead, with the target plan chosen up front.

**Not while a withdrawal is under review (2026-09-23).** While a withdrawal of the whole event, or
of an upgrade, is `HELD`, this checkout is `409 PURCHASE_WITHDRAWAL_OPEN` (5084): a new upgrade would
be priced on the plan under review and outlive its release. See [withdrawal-compliance-phase2-fe-integration.md](withdrawal-compliance-phase2-fe-integration.md) §9.

**Priced duration to duration (2026-09-23).** The target plan must rank above the event's (plans rank
by their cheapest duration), and the chosen duration must be **at least as long as the event's own**
and cost more than it. The charge is the difference between the two durations' current prices, with
the *target* plan's own discount then applied to that difference:

- A shorter duration, or one that doesn't cost more, is refused with `409 PLAN_TIER_NOT_AN_UPGRADE`
  (5029) — "An upgrade keeps at least the N months this event has." There is no downgrade flow.
- A `coverageOptionId` that isn't a live duration of the target plan → `400 COVERAGE_OPTION_INVALID`
  (5077).
- Both plans must share a currency — `409 PLAN_TIER_CURRENCY_MISMATCH` (5030) if they don't. Catalog
  misconfiguration; the host sees a generic failure and support has to fix the catalog.

On settlement, the event moves onto the target plan and duration immediately, and `coverageEndsAt`
moves later by the months the new duration adds (none for a same-length upgrade) — unlike activation,
**this does change something readable elsewhere**: re-read `GET /api/config`'s plan-gated fields
(`moduleKeys`, quotas) and the event's `coverageEndsAt` after the order settles.

**Withdrawable on its own (2026-09-23).** Within 14 days of its payment an upgrade can be withdrawn
by itself (§9, "one order"). It takes every upgrade bought after it with it, and the event goes
back to the plan and duration underneath; `coverageEndsAt` moves back by the months they added. A
withdrawal of the whole event refunds every upgrade too. There is no other downgrade.

**Discount codes do not reach an upgrade (changed 2026-09-22).** A code buys a discount on the
event's *activation* and stops there: the code bound at activation is deliberately not read when an
upgrade is priced, and there is no code field on this screen. The target plan's own catalog promotion
still comes off the difference, so computing the number client-side is still not safe for display —
a naive subtraction of the two durations' prices ignores it. **Don't compute this number yourself;
render `GET /api/events/{eventId}/upgrade-options` as-is** — see `collaborations-fe-integration.md`
§1c, which returns every valid target plan with each of its eligible durations already fully priced.
Since 2026-09-24 each option also carries `breakdown`: exactly what `upgrade-checkout` will store
for it, item by item (`billing.item.upgrade.*` labels). Its `payableAmountMinor` and `gapAmountMinor`
are read from that breakdown's `totalMinor` and `listTotalMinor`.
Sending a code to the preview endpoint with an upgrade target is refused with `409
DISCOUNT_NOT_APPLICABLE_TO_UPGRADE` (5076).

## 7e. Coverage extensions

Added 2026-09-24. A live event's primary host buys more months of coverage at one of the plan's
`extensionOptions`. `GET /api/events/{eventId}/extension-options` lists them priced, and is empty
when the plan sells none. `POST /api/events/{eventId}/extension-checkout` takes
`{ coverageOptionId, requestsImmediateStart, acknowledgesWithdrawalTerms, termsVersion }` and
answers a `CheckoutResponseDto`.
- Never discounted.
- Refused with `409` 5085 once coverage has ended.
- Each settled extension moves `coverageEndsAt` out by its months.
- Refunded by time over its own span (§9).

The full contract is in
[coverage-options-and-extensions-fe-integration.md](coverage-options-and-extensions-fe-integration.md) §11.

## 8. The billing read endpoint

```http
GET /api/events/{eventId}/billing        # host only
```

One read, everything about the event's money. This is what the plan-settings page
(`/events/{id}/settings/plan`) is built from, and the correct polling target after any checkout.

```jsonc
{
  "eventStatus": "ACTIVE",
  "planTierCode": "EVENT_STANDARD",
  "planTierName": "Standard",
  "coverageOptionId": "2a77…",             // the duration the event is on — added 2026-09-23
  "coverageMonths": 6,
  "orders": [                              // newest first; every order ever placed on this event
    { "id": "…", "kind": "ACTIVATION", "status": "PAID",
      "amountMinor": 4900, "addonAmountMinor": null,
      "currency": "EUR", "paidAt": "…", "createdAt": "…",
      "setupAmountMinor": 245, "eventDayAmountMinor": 2940, "hostingAmountMinor": 1715,
      "coverageMonths": 6, "coverageMonthsAdded": null, "buyerType": "CONSUMER",
      "breakdown": { /* PriceBreakdown as §6 step 3, with withdrawal.windowClosesAt filled
                        while the order is PAID; null on orders from before 2026-09-24 */ } }
  ],
  "addons": [                              // entitlements the event owns — see §7a
    { "code": "UNLOCK_WISHLIST", "name": "Gift Wishlist", "priceAmountMinor": 300,
      "billingPeriod": "ONE_TIME", "activatedAt": "…" }
  ],
  "discount": {                            // null when the event carries no active code — see
                                            // collaborations-fe-integration.md §1c
    "label": "Barn Venue partner rate",
    "discountPercent": 15,
    "appliedAt": "…"
  },
  "storageTrimDueAt": null                 // set while media over the storage limit is scheduled
                                            // for deletion — §7b, §9
}
```

**That's the whole shape**, `discount` and `storageTrimDueAt` included. There is no `coverage` block and no `subscription`
block — nothing to compute a paid-through date or a freeze date from, because nothing lapses. If your
code still reads `billing.coverage` or `billing.subscription`, delete it; those fields do not exist
on the response any more. No provider session or payment ids are returned either, and `discount`
carries no raw code string and no partner identity — `label` is display text only. If support needs
more, that is an admin question.

`discount` is what makes the code the host typed at activation visible anywhere after the fact —
show it on this settings page so a host who redeemed a code once doesn't have to remember it applied.
It is a record of what the activation was priced at, not a standing rate: it does not reach upgrades
or storage packs (§7d). The block does not change when an upgrade settles either, because the code is
bound to the event rather than to one order.

**`setupAmountMinor` / `eventDayAmountMinor` / `hostingAmountMinor` (added 2026-09-18) are the
three-line withdrawal split**, snapshotted on the order at checkout time and summing to
`amountMinor`. They exist on every order, but only carry meaning on `ACTIVATION` and `UPGRADE` —
they are the same lines a withdrawal computation refunds from (§9). Not worth rendering on this
screen by themselves; they matter once a withdrawal is in play.

**`coverageOptionId` / `coverageMonths` (added 2026-09-23)** are the duration the event is on today.
The event response carries neither, so read them here. On each order, `coverageMonths` is the months
that order bought (`null` on a storage pack) and `coverageMonthsAdded` is how far an `UPGRADE` moved
`coverageEndsAt` (`null` on every other kind).

**`buyerType` (added 2026-09-24)** is `CONSUMER` or `BUSINESS`, pinned at checkout. Hide Withdraw
on `BUSINESS` orders (§9, Business buyers).

**`breakdown` (added 2026-09-24, phase 4)** is the price breakdown pinned on the order when its
checkout was opened: the same object the checkout response returned. The billing view fills
`withdrawal.windowClosesAt` from `paidAt` while the order is `PAID` (the date may already be past);
it stays `null` before payment and once the order is refunded or reversed. `null` on an order
created before V106. On an activation or upgrade, the three split fields above are copied from its
`ACTIVATION`, `EVENT_DAY` and `COVERAGE` items, so the two always agree.

---

## 9. Withdrawal

The old admin-approved, all-or-nothing "refund request" is gone. Withdrawal is fully automated: the
host asks, the server computes exactly what is owed under Directive 2011/83/EU and either refunds it
immediately or holds the request for a human when a fraud signal fires. There is no `DRAFT` return
path any more — withdrawing is **terminal**.

```
host opens withdrawal-preview  ──►  shows eligibility + exact amount, nothing persisted
        │
host confirms POST /withdrawals
        │
        ├─ refused at the gate ──► 409 WITHDRAWAL_REFUSED, event untouched
        ▼
   computed + fraud-checked
        │
        ├─ clean ──► REFUNDED immediately: money back per line, event soft-deleted
        └─ flagged ──► HELD for an admin (or always, in MANUAL mode) — released (optionally keeping the event day)
                        within 10 days, auto-released if nobody acts
```

### Business buyers (added 2026-09-24)

A business purchase (an order with `buyerType: BUSINESS`) has no consumer right of withdrawal.
- A business **activation** refuses the EVENT withdrawal with `BUSINESS_PURCHASE`.
- A business **upgrade or pack** refuses its ORDER withdrawal with `BUSINESS_PURCHASE`.
- An EVENT withdrawal of a consumer activation leaves business upgrades and packs unrefunded. The
  preview lists them in `excludedOrders`, and so does the filed request, as they stood when it was
  filed.
- A consumer upgrade's ORDER withdrawal still takes every newer upgrade with it. A newer business
  upgrade there is refunded pro rata like a consented order (setup kept), and its line says
  `buyerType: BUSINESS`.
- Business orders don't count for the primary-host transfer lock (5081).

Details: [business-buyers-fe-integration.md](business-buyers-fe-integration.md) §4.

### Price breakdown, legal texts and emails (added 2026-09-24)

Phase 4. Full reference:
[withdrawal-compliance-phase4-fe-integration.md](withdrawal-compliance-phase4-fe-integration.md).

- **Terms version `2026-09-24`** (superseded by `2026-09-25` on the same day, when coverage extensions
  shipped). Checkout bodies must send the current version from `/api/config`.
- **Each item carries its withdrawal rule.** `breakdown.items[].withdrawal` is
  `RETAINED_ONCE_STARTED` (setup), `RETAINED_ONCE_PERFORMED` (event day and add-ons),
  `PRO_RATA_BY_TIME` (coverage, storage packs) or `BUSINESS_NO_RIGHT` (every item of a business
  order). These are the lines this section refunds from.
- **Where to show the withdrawal button.** On each order while `breakdown.withdrawal.available` and
  now is before `breakdown.withdrawal.windowClosesAt` (§8). The label and placement rules for the
  Art. 11a "Withdraw from contract here" function are in the phase 4 guide.
- **Legal texts.** `GET /api/legal/withdrawal-terms?locale=en|el` (current version) and
  `GET /api/legal/withdrawal-terms/{version}?locale=` (the version an order was bought under) return
  `{ version, locale, withdrawalInformation, modelForm }`, both Markdown. Public, no auth. An unknown
  version is `404`; an unknown locale falls back to `en`.
- **Emails the host now gets.** A payment confirmation for every settled order (items, total,
  coverage end, window close, and for a consumer the withdrawal information and model form of the
  order's terms version). A withdrawal acknowledgement for every submission, `REFUSED` included,
  with when it was received, what it covers and the outcome. Don't send your own copies.

### The price split and what each line does

Every `ACTIVATION`/`UPGRADE` order is split into three lines at checkout (§8): **setup** (non-
refundable once the host asked for immediate start — C-641/19), **event-day** (retained once
`startAt` has passed — not `endAt`, which the host can still move on a live event), and **hosting**
(refunded pro rata for the time between payment and withdrawal against `coverageEndsAt`, the
retention window pinned at activation).

**Changed 2026-09-21 — rescheduled events.** A host may still move `startAt` forward on a live event
(postponing is ordinary), but the date they paid for is pinned server-side and a withdrawal on an
event whose `startAt` differs from it is **always `HELD`** for review, never auto-refunded. (Except
a storage pack withdrawn on its own, which is never screened, 2026-09-23.) Three things follow for
the FE:
- A new fraud signal code appears in the admin queue: `SCHEDULE_MOVED_AFTER_PAYMENT` (`observed`
  carries both dates, e.g. `"paid for 2026-10-03T18:00Z, now set to 2026-12-01T18:00Z"`). Nothing
  to special-case — the admin screen already renders every signal generically.
- `usageFacts` gains `activatedStartAt` (ISO string, may be `null` for events activated before this
  change). Display-only, as before.
- Host copy: when the preview's `scheduleMovedAfterPayment` is `true` (added 2026-09-23), the
  withdrawal confirmation dialog should say "Because this event's date was changed after payment,
  your request will be reviewed by a person". It is the same check the signal makes when the
  request is filed. `false` promises nothing — other signals can still hold a request, and those are
  deliberately not disclosed — so never turn it into "you will be refunded immediately".

A host who never gave consent — which cannot currently happen through this API, since
`requestsImmediateStart`/`acknowledgesWithdrawalTerms` are mandatory on checkout (§6) — would be
entitled to a full refund of everything (art. 14(4)(a)); this case is theoretical today, not
something the FE needs to branch on.

### `GET /api/events/{eventId}/withdrawal-preview` — primary host

Call it when the withdrawal screen loads. Safe to call any time — **nothing is persisted**, so poll
it freely as the host reads the confirmation dialog.

```jsonc
{
  "eligible": true,
  "refusals": [],                     // [{ code, message, detail }] when eligible is false
  "windowClosesAt": "2026-09-24T09:14:22Z",
  "totalRefundMinor": 3965,
  "currency": "EUR",
  "lines": [
    { "orderId": "…", "orderKind": "ACTIVATION", "windowClosesAt": "…", "basis": "CONSENTED_PRO_RATA",
      "hostingStart": "…", "hostingEnd": "…", "usedSeconds": 432000, "totalSeconds": 2592000,
      "eventPerformed": false, "keepEventDay": false, "refundMinor": 3965, "providerRefunded": false,
      "components": { "setup": { /* … */ }, "eventDay": { /* … */ }, "hosting": { /* … */ } },
      "buyerType": "CONSUMER" }        // added 2026-09-24
  ],
  "scheduleMovedAfterPayment": false, // true → a withdrawal will be HELD for review (see above)
  "scope": "EVENT", "orderId": "…", "instant": false, "storageAfter": null,
  "excludedOrders": []                // added 2026-09-24: business orders left unrefunded (§9, Business buyers)
}
```

- `refusals[].message` is written to be shown to the host verbatim, same convention as the old
  eligibility reasons.
- `windowClosesAt` and `currency` are both `null` on an ineligible preview with no settled activation
  (refusal `NO_SETTLED_ACTIVATION` or `ALREADY_REFUNDED`).
- `windowClosesAt` is the first instant withdrawal is no longer possible: the end of the 14th day
  after payment, Athens time, moved to the end of Monday when that day falls on a weekend
  (2026-09-23; it used to be `paidAt` + 14×24h).
- `scheduleMovedAfterPayment` (added 2026-09-23) is `true` when `startAt` has moved off the date
  that was paid for, on a withdrawal that is screened: always `false` on a storage pack's preview. Show the "reviewed by a person" line from the price-split section above when it
  is. It is a fact about the event, so it is set on an ineligible preview too, where it has nothing
  to warn about.
- `lines` covers every order a withdrawal would touch, one line each with its own `components`
  breakdown (JSON, shape-stable but not enumerated here; display-only, never recompute from it).
  For the event: every settled consumer-bought upgrade, every settled consumer-bought storage pack
  (business-bought ones are in `excludedOrders` instead; basis `PRO_RATA_BY_TIME`,
  since 2026-09-23; `NO_CONSENT_FULL_REFUND` for a pack bought before then), then the activation. Each line carries its own order's `windowClosesAt`.
- `scope`, `orderId`, `instant`, `storageAfter` (2026-09-23): see "one order" below. On this
  endpoint `scope` is `EVENT`, `instant` is `false` and `storageAfter` is `null`.

### `POST /api/events/{eventId}/withdrawals` — primary host

```jsonc
// body optional
{ "reason": "Our venue cancelled and we can't reschedule in time." }
```

`reason` is optional (unlike the old mandatory refund reason), max 1000 chars. Rate limited to **5
per hour per user**, same budget as before.

Returns **201** with a `WithdrawalResponseDto` when the outcome is `REFUNDED` or `HELD`. When the
request is refused at the gate, the server answers **409 `WITHDRAWAL_REFUSED`** (5073) with the
standard error envelope — `detail` is the joined refusal messages — **not** the
`WithdrawalResponseDto` body; a persisted `REFUSED` row still exists for the audit trail, but this
endpoint doesn't hand it back on the 409. If you need the structured reasons for the confirmation UI,
read them from the preview call instead of this response.

```jsonc
// 201 — REFUNDED
{
  "id": "…", "eventId": "…", "scope": "EVENT", "orderId": "…", "status": "REFUNDED", "reason": "…",
  "createdAt": "…", "decidedAt": null, "decisionNote": null, "holdUntil": null,
  "totalRefundMinor": 3965, "currency": "EUR",
  "refusals": [], "lines": [ /* same shape as the preview's lines */ ],
  "excludedOrders": []   // added 2026-09-24: as the preview's, recorded when the request was filed
}
```

```jsonc
// 201 — HELD
{
  "id": "…", "eventId": "…", "scope": "EVENT", "orderId": "…", "status": "HELD", "reason": "…",
  "createdAt": "…", "decidedAt": null, "decisionNote": null,
  "holdUntil": "2026-09-27T00:00:00Z",
  "totalRefundMinor": 3965, "currency": "EUR",
  "refusals": [], "lines": [ /* … */ ], "excludedOrders": []
}
```

**Terminal on success.** A `REFUNDED` withdrawal soft-deletes the event in the same call: `GET
/api/events/{eventId}` starts 404ing for non-hosts, and the host's own event list should show a
"withdrawn" state with a download-only link to gallery and wishbook until the event's
`deletionScheduledFor` (the purge timestamp on `GET /api/events/{id}`; the retention term itself is
not exposed on `GET /api/config`) — there is no "undo" or "restore to draft" any more. Attempting to
cancel a pending deletion on a withdrawn event (`DELETE /api/events/{eventId}/deletion-requests`) is
refused with `409 EVENT_WITHDRAWN` (5071). See `soft-deleted-events-fe-integration.md` for what a
host can still read and do on a withdrawn event.

A `HELD` withdrawal changes nothing yet — the event stays exactly as it was while an admin (or the
10-day auto-release) decides it.

### One order: `GET/POST /api/events/{eventId}/orders/{orderId}/withdrawal-preview|withdrawals` — primary host

Added 2026-09-23. Withdraws one storage pack, one coverage extension (since 2026-09-24), or one
upgrade together with every upgrade bought after it. **The event stays.** Same body, same rate
limit, same 201/409 answers as the event endpoints. The full contract (refusal codes, `instant`,
`storageAfter`, the 7-day storage trim) is in
[withdrawal-compliance-phase2-fe-integration.md](withdrawal-compliance-phase2-fe-integration.md)
§4–§7.

- An `ACTIVATION` `orderId` is `400` `5082`: use the event endpoints. Another event's order, or an
  unknown one, is `404` `2001`.
- A pack or an extension is refunded at once (`instant: true` on its preview) unless the platform
  is in manual mode. An extension is refunded by time over its own span, and coverage comes in by
  what it had not yet supplied. An upgrade is screened and may be `HELD`.
- Each order has its own 14-day window from its own payment.

### `GET /api/events/{eventId}/withdrawals` — primary host

The event's withdrawal history, newest first — every attempt, including refused ones. Drives a
"withdrawal history" panel the same way the old refund-request history did.

Each row carries `scope` and `orderId` (2026-09-23). `decisionNote` is set on released requests:
the reviewer's note, or what the evidence rule found on an auto-release of a moved event. Show it
as plain text. A line whose order had already been refunded another way (a chargeback) is released
with `refundMinor: 0`, and `totalRefundMinor` counts only what the withdrawal itself paid back.

All five host-side withdrawal endpoints (the two previews, the two filings, history) answer **403
`WITHDRAWAL_NOT_PRIMARY_HOST`** (4005) for a co-host. Withdrawal ends the event and refunds the
card that paid for it, so it is the primary host's alone — exactly like requesting deletion.

### `GET /api/admin/withdrawals` — admin

The queue of `HELD` requests, each with the full facts sheet the automated decision was based on —
this is what the admin review screen is built on.

```jsonc
[
  {
    "request": { /* WithdrawalResponseDto — status "HELD" */ },
    "usageFacts": { /* the UsageFacts the computation ran on — display-only, not enumerated here */ },
    "fraudSignals": [
      { "code": "NEW_ACCOUNT_FAST_WITHDRAWAL", "fired": true,
        "observed": "account 3 days old, withdrawn 1 day after payment", "threshold": "≥7 / ≥3" }
    ],
    "recommendation": "Two signals fired: a new account withdrew fast, and this host has a prior "
                     + "withdrawal on file. Review before releasing."
  }
]
```

Every signal the computation evaluated is listed, fired or not — build the screen to show the whole
list, same convention as the old gate reasons: an admin who only sees the signals that fired can't
tell whether the others were even checked. `recommendation` is generated plain text meant to be read
as-is, not parsed.

### `POST /api/admin/withdrawals/{requestId}/release` — admin

```jsonc
// body optional
{ "keepEventDay": true, "note": "The party took place on 3 October; 64 photos from that night." }
```

- **No body**, or `keepEventDay: false`, refunds exactly as computed at request time. Prices are not
  re-calculated against today's date.
- **`keepEventDay: true`** keeps the event-day share, and any add-on, on each activation and upgrade
  line, because the event took place on the date that was paid for. Storage packs are untouched, and
  so is an upgrade bought after that date: it had no part in the day.
  - It is refused unless that date had passed **when the host withdrew**: `409` `5083`
    `WITHDRAWAL_KEEP_EVENT_DAY_NOT_DUE`. The host owes only for what was supplied before they
    withdrew, so a date that passes during the hold doesn't count. Offer it only when
    `usageFacts.activatedStartAt` is before the request's `createdAt`, and never on a storage-pack
    request (it changes nothing there, and its `usageFacts` is `null`).
  - It needs a `note`: `400` `3001` otherwise.
- With a body, `keepEventDay` is required (`400` `3001` without it). `note` is at most 1000 chars and
  is **shown to the host** as `decisionNote`.
- An EVENT request is deleted, as with an automatic `REFUNDED`. An ORDER request's event stays.
- `409` `WITHDRAWAL_NOT_HELD` (5074) if the request isn't currently `HELD`: a double click, a stale
  queue, or the auto-release got there first. Refetch.

**There is no withhold** (removed 2026-09-23, together with the account suspension it caused). The
law requires no reason to withdraw, and a stolen card goes through the provider's dispute process.
`WITHHELD` rows from before stay readable.

**Auto-release on evidence.** A request held because the event's date moved after payment is
auto-released after 10 days. If the date that was paid for had passed when the host withdrew, and
at least 20 uploads (never fewer than 1, whatever the setting), deleted ones included, landed in
the 24 hours from that date, it is released with the event day kept, as a reviewer would. What the
rule found goes into `decisionNote`. Each held request is released on its own, so one that fails
stays `HELD` for the next sweep without holding up the others.

The release endpoint is rate limited to **30/min per admin**, in the `admin.money` bucket it shares
with `POST /orders/{id}/settle`, webhook replay, add-on removal and the collaboration and
discount-code admin writes.

---

## 10. Notifications

All billing notifications arrive through the existing feed — `GET /api/notifications`,
`GET /api/notifications/unread-count`, `PATCH /api/notifications/{id}/read`,
`PATCH /api/notifications/read-all`, `DELETE /api/notifications/{id}` — with no new plumbing.

Every one below is `category: "BILLING"`, which means it is **emailed as well as shown in the feed**,
and every one carries `ctaTarget: "EVENT_PLAN_SETTINGS"` with `ctaParams: { eventId }`. As of
2026-09-04 this is a resolved key, not a literal path — see the `NotificationCtaTarget` note near
`NotificationResponseDto` above. Resolve it through your own route map; do not string-concatenate it.

**There is no dunning any more.** `BILLING_EXPIRING`, `BILLING_PAST_DUE` and `BILLING_PURGE_WARNING`
are deleted from `NotificationType` — there is nothing left for a scheduled sweep to warn a host
about, since activation never lapses. Remove any handling for these three types.

### Withdrawal outcomes (added 2026-09-18)

**`REFUND_APPROVED`/`REFUND_REJECTED` are gone from active use** — nothing emits them any more now
that admin-approved refunds have been fully replaced by automated withdrawal (§9). They are still
listed in `NotificationType` on the backend so historical rows keep reading, but no new one is ever
produced; remove any handling that expects to see them going forward.

| `type` | severity | when |
|---|---|---|
| `WITHDRAWAL_REFUNDED` | `CRITICAL` (`INFO` for one order) | the withdrawal was executed: money is on its way back and, for the whole event, the event is soft-deleted. Since 2026-09-24 the whole-event body also says how many business purchases, for how much, are not refunded |
| `WITHDRAWAL_HELD` | `INFO` | a fraud signal fired (or the platform is in `MANUAL` mode); an admin will decide within 10 days |
| `WITHDRAWAL_WITHHELD` | `CRITICAL` | legacy: nothing emits it since 2026-09-23 (withhold was removed) |
| `STORAGE_TRIM_SCHEDULED` | `WARNING` | a withdrawal or chargeback left the event over its storage limit; the newest media above it will be deleted on `trimDueAt` unless space is freed |
| `STORAGE_TRIM_WARNING` | `CRITICAL` | the same deletion is about 2 days away; sent once |

The payload carries what the UI needs without a second fetch:

```jsonc
{
  "withdrawalId": "…",
  "scope": "EVENT",             // or "ORDER" (2026-09-23): the event stays
  "orderId": "…",
  "status": "REFUNDED",         // "REFUNDED" | "HELD"
  "totalRefundMinor": 3965,
  "currency": "EUR",
  "providerRefunded": true
}
```

`providerRefunded: false` on a `WITHDRAWAL_REFUNDED` notification means the money is being returned
by hand — do not tell the host to expect it on their statement in the usual few days.

`WITHDRAWAL_REFUNDED` is the only notification of the three that reports an event *disappearing* —
give it real weight in the feed, the same way `REFUND_APPROVED` used to. An ORDER-scope `WITHDRAWAL_REFUNDED`
is `INFO`, not `CRITICAL`: the event stays. Branch on `payload.scope`. The two `STORAGE_TRIM_*`
types point at `EVENT_GALLERY`, not `EVENT_PLAN_SETTINGS`, and their payload is in
[withdrawal-compliance-phase2-fe-integration.md](withdrawal-compliance-phase2-fe-integration.md) §7.

### What to add on your side

Add `BILLING` to any notification-category filter UI, and `WITHDRAWAL_REFUNDED`/`WITHDRAWAL_HELD`/
`STORAGE_TRIM_SCHEDULED`/`STORAGE_TRIM_WARNING` to the `NotificationType` union in `frontend-api-types.ts`, in place of
`REFUND_APPROVED`/`REFUND_REJECTED`. Unknown types should already render as a generic
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
| `POST /api/events/{id}/checkout` | 10 / min | shared with `upgrade-checkout` and `storage-checkout` |
| `POST /api/events/{id}/addons` | 30 / min | per user; the DRAFT-only opt-in, not a checkout |
| `POST /api/events/{id}/refund-requests` | 5 / hour | per user, not per event |
| `PUT /api/me/business-profile` | 10 / hour | per user; 400s count too, so don't retry a validation failure in a loop |
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
| `3007` `INVALID_PLAN_TIER_SCOPE` | 400 | admin sets `eventTypeKey` on an `ACCOUNT`-scope plan (§13), or `planTierIds` names one for a paid service; since 2026-09-23 also `priceAmountMinor` on an `EVENT`-scope plan, or a coverage option on an `ACCOUNT`-scope one | admin panel only |
| `3008` `EVENT_DATES_INCOMPLETE` | 400 | checkout with no `startAt`/`endAt`, or `endAt <= startAt` | "Set your event's dates before publishing" — link to the schedule form |
| `3010` `RATE_LIMITED` | 429 | the caller's budget for the window is spent | §11 |
| `3018` `INVALID_EVENT_TYPE` | 400 | unknown `eventType` at `GET /api/plan-tiers?eventType=X`, event creation, or admin's `duplicate`/plan create (§2, §13) | refetch `GET /api/config`'s `eventTypeKeys`, the value was stale or mistyped |

### Plans and quotas

| code | HTTP | when | what to show |
|---|---|---|---|
| `5008` `EVENT_STORAGE_LIMIT_EXCEEDED` | 409 | upload exceeds the event plan's storage | upgrade prompt built from `details` |
| `5009` `EVENT_MEMBER_LIMIT_EXCEEDED` | 409 | member add / invite acceptance exceeds the cap | upgrade prompt |
| `5011` `PLAN_TIER_IN_USE` | 409 | admin deleting a plan that is still assigned | offer archiving instead |
| `5012` `MODULE_NOT_AVAILABLE` | 409 | a module action where `isAvailable` is false | "not included in this plan" — and, if a matching `MODULE_UNLOCK` exists in `paidServices`, the §7c offer |
| `5013` `PLAN_TIER_IS_ONLY_DEFAULT` | 409 | admin removing the last default plan | admin panel only |
| `5015` `PLAN_TIER_NOT_PURCHASABLE` | 409 | the plan was archived or hidden since page load | refetch `/api/config`, ask them to pick again |
| `5019` `PLAN_TIER_NOT_PRICED` | 409 | catalog misconfiguration — the plan sells no duration (no live coverage option) or has no currency. Before 2026-09-23: no activation price set | generic error + support contact; the host cannot fix this |
| `5077` `COVERAGE_OPTION_INVALID` | 400 | a `coverageOptionId` (event create/patch, code previews, upgrade checkout, admin assignment) is unknown, retired, the wrong kind, or another plan's; or missing on event create or `targetCoverageOptionId`. Missing on the new-event preview or upgrade checkout is `3001 VALIDATION_FAILED` instead; missing on patch or admin assignment is not an error (unchanged / default duration) | refetch the plan's `initialOptions` and ask them to pick again |
| `5078` `COVERAGE_OPTION_UNAVAILABLE` | 409 | the draft's duration was retired after it was chosen (activation checkout and its preview); or an admin create/assignment needs a default duration on a plan that sells none | send the host back to pick another duration |
| `5079` `COVERAGE_OPTION_LAST_INITIAL` | 409 | admin retiring the last duration a public, assignable plan is sold at | admin panel only; add another duration first |
| `5080` `COVERAGE_OPTION_DUPLICATE` | 409 | admin adding, or reactivating, a duration the plan already sells live | admin panel only; retire the other one first |
| `5081` `HOST_TRANSFER_WITHDRAWAL_OPEN` | 409 | `POST /api/events/{eventId}/hosts/{id}/primary` while a paid order can still be withdrawn | wait until `details.unlocksAt` |
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
| `5014` `EVENT_NOT_ACTIVE` | 409 | upgrade, storage or extension checkout on a `DRAFT` event; or a guest/module action on one | send to activation / "not published yet" |
| `5085` `COVERAGE_ENDED` (§7e) | 409 | extension options or checkout on a live event whose coverage has already ended | hide "Extend coverage" once `coverageEndsAt` has passed |
| `5017` `EVENT_NOT_DRAFT` | 409 | activation checkout, a DRAFT-only add-on opt-in, or (2026-09-23) a `coverageOptionId` change, on an event already `ACTIVE` | usually a stale tab; refetch the event |
| `5018` `ORDER_NOT_PENDING` | 409 | admin settling an already-settled order | admin panel only |
| `5028` `ORDER_AMOUNT_MISMATCH` | 409 | the amount a provider confirms paying doesn't match what the order was opened for | never expected from client action; log and treat as a settlement failure |
| `5029` `PLAN_TIER_NOT_AN_UPGRADE` (§7d) | 409 | upgrade-checkout's target plan doesn't rank above the event's, or the chosen duration is shorter than the event's own or doesn't cost more | build the picker from `upgrade-options` (§7d), which lists only valid durations |
| `5030` `PLAN_TIER_CURRENCY_MISMATCH` (§7d) | 409 | the current and target plans are priced in different currencies | catalog misconfiguration; host sees a generic failure and support has to fix the catalog |
| `5031` `CHECKOUT_SESSION_UNRESOLVED` | 409 | a checkout session with the provider couldn't be resolved during reconciliation | internal; surfaces as the generic "still processing" state (§6 step 5), not a distinct UI |
| `5046` `CHECKOUT_AMOUNT_BELOW_MINIMUM` | 409 | a plan discount cut a checkout's price below what the provider will charge at all | catalog misconfiguration (discount set too steep); host sees a generic failure and support has to fix the discount |
| `5053` `PLAN_TIER_NOT_AVAILABLE_FOR_EVENT_TYPE` | 409 | `POST /api/events`'s `planTierCode` has restricted itself away from the request's `eventType` (§2, §6) | source the plan list from `GET /api/plan-tiers?eventType=X` instead of a stale/cached one |
| `5071` `EVENT_WITHDRAWN` | 409 | `DELETE /api/events/{eventId}/deletion-requests` on an event whose activation was refunded via withdrawal (§9) | not fixable — a withdrawn event's deletion cannot be cancelled; point the host at the download-only gallery/wishbook link instead |

### Withdrawal

| code | HTTP | when | what to show |
|---|---|---|---|
| `5072` `WITHDRAWAL_TERMS_VERSION_STALE` | 400 | checkout's `termsVersion` (§6, §7d) doesn't match the version currently in force | reload `GET /api/config`, re-show the current terms, let the host retry once |
| `5073` `WITHDRAWAL_REFUSED` | 409 | the withdrawal was refused at the gate — no settled activation, window closed, already in progress, already refunded, bought as a business (`BUSINESS_PURCHASE`, 2026-09-24: no consumer right of withdrawal); for one order also order not paid, order already withdrawn (§9) | the `detail` string on the error envelope; for the structured per-reason list, call withdrawal-preview instead |
| `4005` `WITHDRAWAL_NOT_PRIMARY_HOST` | 403 | the caller is a co-host, not the primary host (`displayOrder: 0` in `GET /api/events/{id}/hosts`) — withdrawal refunds the payer and deletes the event, so it is gated like deletion | hide the withdraw entry point for co-hosts; if reached, "Only the primary host can withdraw this event." |
| `4006` `PURCHASE_NOT_PRIMARY_HOST` | 403 | a co-host calling a checkout, `upgrade-options`, `checkout/preview-code` or `addons`, or a `PATCH /api/events/{id}` that changes a draft's `coverageOptionId` | only the primary host buys; hide the action |
| `5074` `WITHDRAWAL_NOT_HELD` | 409 | admin release on a request that isn't currently `HELD` | double-click or stale admin queue; refetch |
| `5082` `WITHDRAWAL_ORDER_KIND_NOT_SUPPORTED` | 400 | an ORDER withdrawal named the `ACTIVATION` | use the event's withdrawal endpoints |
| `5083` `WITHDRAWAL_KEEP_EVENT_DAY_NOT_DUE` | 409 | admin release with `keepEventDay: true` when the date that was paid for hadn't passed when the host withdrew | release as computed |
| `5084` `PURCHASE_WITHDRAWAL_OPEN` | 409 | a storage pack or upgrade checkout while a withdrawal it would miss is `HELD` (§7b, §7d) | hide the purchase while the withdrawal is under review; the `message` can be shown as is |

**`5022`–`5025` (`REFUND_NOT_ELIGIBLE`, `REFUND_ALREADY_REQUESTED`, `REFUND_REQUEST_NOT_PENDING`,
`ORDER_NOT_REFUNDABLE`) are dead as of 2026-09-18.** The endpoints that used to throw them are
deleted along with the admin-approval refund flow; nothing in the API produces them any more. They
remain defined as `ErrorCode` constants so old log lines still resolve, but there is nothing for the
FE to branch on — remove any handling for them.

`403` on any host endpoint means the caller is not a host, except that buying and
withdrawing are primary-host-only (4006, 4005).

---

## 13. Admin endpoints

All require `ROLE_ADMIN`; non-admins get `403`.

### Money and lifecycle

| endpoint | effect |
|---|---|
| `POST /api/admin/orders/{orderId}/settle` | marks an order paid without a provider payment — bank transfer, comped event, lost webhook. Activates the event exactly as a real payment would. |
| `GET /api/admin/webhooks/unprocessed` | deliveries received but never processed — settlements the platform may have lost. The remedy is usually `settle` above. |
| `POST /api/admin/webhooks/{provider}/{providerEventId}/replay` | re-verifies and re-runs one delivery from the list above against the provider's signed payload. For anything `settle` can't express — a refund, a lost dispute — that only ever arrives once. |
| `GET /api/admin/withdrawals` | the held-withdrawal queue with the full facts sheet (§9) |
| `POST /api/admin/withdrawals/{id}/release` | decide a held withdrawal, optionally keeping the event day (§9) |
| `DELETE /api/admin/events/{eventId}/addons/{code}` | removes an entitlement (add-on or storage pack). Refuses on any `ACTIVE` event (§7a, §7b) — an admin correction tool, not something used on a live event. |

### The plan catalog

| endpoint | notes |
|---|---|
| `GET /api/admin/plan-tiers?scope=EVENT&includeArchived=true` | both params optional. Unlike `/api/config`, returns non-public and archived plans — the admin's full view. |
| `GET /api/admin/plan-tiers/{id}` | `404` if not found |
| `POST /api/admin/plan-tiers` | create; validation below |
| `PATCH /api/admin/plan-tiers/{id}` | partial update. **`code` and `scope` are immutable** and absent from the patch DTO. |
| `DELETE /api/admin/plan-tiers/{id}` | `204`, or `409 PLAN_TIER_IN_USE` if assigned to any user or event |
| `PUT /api/admin/plan-tiers/{id}/modules` | sets `moduleKeys` |
| `POST /api/admin/plan-tiers/{id}/duplicate` | clones the plan into one or more other event types in one call, stamping `sharedGroupKey` on source + clones — see [`plan-tiers-by-event-type-fe-integration.md`](plan-tiers-by-event-type-fe-integration.md) §5. Replaces the old `PUT .../event-types` (removed 2026-09-13) — `eventTypeKey` is set once at creation and is otherwise immutable, there is no patch endpoint for it |
| `GET` / `POST /api/admin/plan-tiers/{id}/coverage-options`, `PATCH …/coverage-options/{optionId}` | the durations an `EVENT` plan is sold at, and their prices (2026-09-23). `kind` and `months` are fixed once created; retire with `active: false`, never delete. `duplicate` copies them too. See [`coverage-options-and-extensions-fe-integration.md`](coverage-options-and-extensions-fe-integration.md) §8 |

Create/patch validation (server-enforced, `400` / `3001`):

- `code` — required, non-blank, ≤30 chars, `^[A-Z0-9_]+$`. Unique **per scope**, not globally.
- `scope`, `name`, `sortOrder`, `isDefault`, `isAssignable`, `isPublic` — required on create.
- `name` ≤100 chars; `sortOrder >= 0`.
- `storageBytes`, `maxMembers`, `priceAmountMinor` — if present, `>= 0`.
- `priceAmountMinor` is `ACCOUNT`-scope only since 2026-09-23 — rejected with `400
  INVALID_PLAN_TIER_SCOPE` (3007) on an `EVENT`-scope plan, whose prices are its coverage options.
  `storageBytes`/`maxMembers` are the mirror image: `EVENT`-scope only, rejected the same way on an
  `ACCOUNT`-scope plan. A new `EVENT` plan has no durations and is not on sale until one is added.
- `autoDeleteMonths` is gone (2026-09-23); sending it is a `400`, like any unknown field.
- `priceCurrency` — if present, exactly 3 chars (ISO 4217).
- `discountPercent` — if present, 0–100. `discountLabel` ≤100 chars.
- `billingPeriod` — `'MONTHLY' | 'YEARLY' | 'ONE_TIME'` or null. In practice always `'ONE_TIME'` on an
  `EVENT`-scope plan — there is no other cadence left for it to bill against.

**Prefer archiving to deleting.** `PATCH { "isAssignable": false }` keeps the plan visible to admins
and to anyone already on it, while hiding it from new assignment. `isPublic` independently controls
catalog visibility. Delete is for a plan created by mistake and never assigned.

### Assignment

| endpoint | body | returns |
|---|---|---|
| `PATCH /api/admin/users/{id}/plan-tier` | `{ "planTierCode": "PRO" }` | **always `409 ACCOUNT_PLANS_DISABLED`** — see below |
| `PATCH /api/admin/events/{id}/plan-tier` | `{ "planTierCode": "PLUS", "coverageOptionId": "…" }` — must be `EVENT` scope; `coverageOptionId` optional (2026-09-23) | `EventUsageResponse` |

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

Since 2026-09-23 it also picks the event's duration on the new plan. `coverageOptionId`, when sent,
must be a live duration of that plan (`400 COVERAGE_OPTION_INVALID`); without it the event takes the
new plan's duration of the same length, else its shortest (`409 COVERAGE_OPTION_UNAVAILABLE` if it
sells none). **The assignment never moves `coverageEndsAt`** — it changes what the event is on, not
how long it is kept.

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
- `billingPeriod` — **every kind is `'ONE_TIME'`, with nothing else accepted.** `MONTHLY` or
  `YEARLY` on any `paid_services` row, regardless of `kind`, → `400 VALIDATION_FAILED` — there is no
  recurring cadence left to bill any of the three kinds on. The admin form doesn't need a picker for
  this field at all; hardcode `'ONE_TIME'` and drop it from the create/patch payload entirely.
  `409 PAID_SERVICE_IN_USE` (5037) still guards the field defensively on `PATCH`, but there is no
  legitimate reason to ever send a different value.
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

  priceAmountMinor: number | null;   // ACCOUNT scope only; always null on EVENT scope — see initialOptions
  priceCurrency: string | null;      // also the currency of every coverage option
  billingPeriod: BillingPeriod | null;  // always 'ONE_TIME' on EVENT scope

  discountPercent: number | null;
  discountLabel: string | null;
  discountStartsAt: string | null;
  discountEndsAt: string | null;

  moduleKeys: string[];         // always empty on ACCOUNT scope
  eventTypeKey: string | null;  // the one event type this plan may be bought for; null only on ACCOUNT scope
  sharedGroupKey: string | null;  // UUID; set only by the admin "duplicate" action — see §2
  paidModules: PaidServiceResponse[] | null;  // MODULE_UNLOCK upsells; null only from admin catalog endpoints
  initialOptions: CoverageOptionResponse[];    // added 2026-09-23 — the durations it is sold at; empty = not on sale
  extensionOptions: CoverageOptionResponse[];  // added 2026-09-23 — sold since 2026-09-24 (§7e)
}

// Added 2026-09-23 — one duration an EVENT plan is sold at.
export interface CoverageOptionResponse {
  id: string;                   // what every coverageOptionId field takes
  kind: 'INITIAL' | 'EXTENSION';
  months: number;
  priceAmountMinor: number;     // in the plan's priceCurrency, before any promotion or code
  sortOrder: number;
  active: boolean;              // always true outside the admin endpoints
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
  billingPeriod: BillingPeriod; // always 'ONE_TIME' — every kind is a single flat charge now
  grantsStorageBytes: number | null;  // set only on STORAGE_PACK, null on the other two
  grantsModuleKey: string | null;     // set only on MODULE_UNLOCK, null on the other two
  planTierIds: string[];        // plan tiers this is offered on; EMPTY MEANS EVERY PLAN
}

export interface EventAddon {
  code: string;
  name: string;
  priceAmountMinor: number;     // what it cost when bought — not a recurring figure
  billingPeriod: BillingPeriod; // always 'ONE_TIME'
  activatedAt: string;
}

// POST /api/events/{eventId}/addons — host, DRAFT only. Returns an EventAddon (§7a, §7c).
export interface EventAddonRequest {
  paidServiceCode: string;      // a RECURRING_ADDON or MODULE_UNLOCK code
}

// POST /api/events/{eventId}/storage-checkout — host, ACTIVE only (§7b). WithdrawalConsent below.
export interface StorageCheckoutRequest extends WithdrawalConsent {
  paidServiceCode: string;      // a STORAGE_PACK code
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
// BREAKING: narrows from 'DRAFT' | 'ACTIVE' | 'FROZEN' | 'PURGED'. Delete any FROZEN/PURGED branch.
export type EventStatus = 'DRAFT' | 'ACTIVE';

// ---------- Checkout ----------
// What an order was sold as, pinned at checkout (2026-09-24). BUSINESS only with a VIES-confirmed
// business profile; a BUSINESS order has no consumer right of withdrawal.
export type BuyerType = 'CONSUMER' | 'BUSINESS';

export interface CheckoutResponse {
  orderId: string;
  redirectUrl: string;
  buyerType: BuyerType;         // added 2026-09-24
  breakdown: PriceBreakdown;    // added 2026-09-24 (phase 4) — the order's pinned breakdown
}

// ---------- Price breakdown (added 2026-09-24, phase 4) ----------
// Full reference: withdrawal-compliance-phase4-fe-integration.md. Snapshots only ever grow: ignore
// fields you don't know.
export type PriceItemCode = 'ACTIVATION' | 'EVENT_DAY' | 'COVERAGE' | 'ADDON' | 'STORAGE_PACK';
export type WithdrawalRule =
  | 'RETAINED_ONCE_STARTED' | 'RETAINED_ONCE_PERFORMED' | 'PRO_RATA_BY_TIME' | 'BUSINESS_NO_RIGHT';
export type DiscountSource = 'PLAN_PROMOTION' | 'CODE';

export interface PriceBreakdown {
  kind: OrderKind;
  currency: string;
  buyerType: BuyerType;
  coverage: {
    optionId: string | null;
    months: number | null;
    monthsAdded: number | null;   // UPGRADE only
    endsAt: string | null;        // null before the event exists (pre-creation preview)
    endsAtProjected: boolean;     // true on a draft's activation: assumes payment now
  } | null;
  items: PriceItem[];             // plan items first, then add-ons; they sum to the totals exactly
  discounts: { source: DiscountSource; label: string | null; percent: number }[];
  combinedDiscountPercent: number;  // may exceed discountCapPercent: a plan promotion is never cut back
  discountCapPercent: number;
  capApplied: boolean;              // true when the cap cut the code back
  listTotalMinor: number;
  discountTotalMinor: number;
  totalMinor: number;
  vat: { included: boolean; note: string };   // note is a message key: 'billing.vat.included'
  termsVersion: string;
  withdrawal: {
    available: boolean;           // false for a business buyer
    windowDays: number;
    windowClosesAt: string | null;  // filled only on a PAID order in the billing view
  };
}

export interface PriceItem {
  code: PriceItemCode;
  labelKey: string;               // e.g. 'billing.item.activation'; localize with {plan}/{name} = name
  name: string;                   // the plan's name on a plan item, the catalog name on an add-on or pack
  listMinor: number;              // priceMinor + discountMinor
  discountMinor: number;
  priceMinor: number;
  withdrawal: WithdrawalRule;
  performedAt: string | null;     // the event's start, on EVENT_DAY and ADDON; null before the event exists
  months: number | null;          // COVERAGE only
  monthsAdded: number | null;     // an upgrade's COVERAGE only
  paidServiceCode: string | null; // ADDON and STORAGE_PACK
  planTierCode: string | null;    // plan items
  storageBytes: number | null;    // STORAGE_PACK
}

// POST /api/events/{eventId}/quote — primary host. Returns a PriceBreakdown.
export interface QuoteRequest {
  kind: 'ACTIVATION' | 'STORAGE_PACK';   // upgrades are priced by upgrade-options
  paidServiceCode?: string;              // required for STORAGE_PACK, refused for ACTIVATION
}

// GET /api/legal/withdrawal-terms[/{version}]?locale= — public. Both texts are Markdown.
export interface WithdrawalTerms {
  version: string;
  locale: 'en' | 'el';            // en when the requested locale isn't available
  withdrawalInformation: string;
  modelForm: string;
}

// Shared by activation, upgrade and (since 2026-09-23) storage checkout — the consent Directive 2011/83/EU art. 14(3)/(4)(a)
// requires before a paid service may begin inside the withdrawal window. A consumer MUST send both
// booleans true; a VIES-confirmed business buyer may omit them (2026-09-24, see
// business-buyers-fe-integration.md §1). termsVersion is required for everybody and comes from
// AppConfigResponse.withdrawal.termsVersion (below). Added 2026-09-18 — a body is now required on
// both checkout endpoints, where none was before.
interface WithdrawalConsent {
  requestsImmediateStart?: boolean;
  acknowledgesWithdrawalTerms?: boolean;
  termsVersion: string;
}

// POST /api/events/{eventId}/checkout — host, DRAFT only (§6).
export interface ActivationCheckoutRequest extends WithdrawalConsent {
  collaborationCode?: string;   // max 40 chars
}

// POST /api/events/{eventId}/upgrade-checkout — host, ACTIVE only (§7d).
export interface UpgradeCheckoutRequest extends WithdrawalConsent {
  planTierCode: string;         // must rank above the event's current plan
  coverageOptionId: string;     // required since 2026-09-23 — one of upgrade-options' options[].coverageOptionId
}

// ---------- Billing ----------
// BREAKING: coverage and subscription are gone — there is nothing left to compute a lapse date from.
export interface EventBillingResponse {
  eventStatus: EventStatus;
  planTierCode: string;
  planTierName: string;
  coverageOptionId: string;     // added 2026-09-23 — the duration the event is on
  coverageMonths: number;       // added 2026-09-23 — its months
  orders: OrderSummary[];       // newest first
  addons: EventAddon[];         // empty if never opted in
  discount: DiscountSummary | null;  // the code the activation was priced with — §8
  storageTrimDueAt: string | null;   // added 2026-09-23 — §7b
}

export interface DiscountSummary {
  label: string;
  discountPercent: number;      // snapshot at redemption, not the code's current rate
  appliedAt: string;
}

export interface OrderSummary {
  id: string;
  kind: 'ACTIVATION' | 'UPGRADE' | 'STORAGE_PACK';
  status: 'PENDING' | 'PAID' | 'FAILED' | 'CANCELLED' | 'REFUNDED';  // REFUNDED: withdrawn or lost dispute
  amountMinor: number;
  addonAmountMinor: number | null;  // the add-on/unlock slice of amountMinor on an
                                     // ACTIVATION order; null on every other kind
  currency: string;
  paidAt: string | null;
  createdAt: string;
  // Added 2026-09-18 — the three-line withdrawal split (§9), summing to amountMinor. Present on
  // every order kind but only meaningful on ACTIVATION/UPGRADE.
  setupAmountMinor: number | null;
  eventDayAmountMinor: number | null;
  hostingAmountMinor: number | null;
  // Added 2026-09-23. coverageMonths: the months the order bought (null on STORAGE_PACK).
  // coverageMonthsAdded: UPGRADE only — how far it moved coverageEndsAt; null on every other kind.
  coverageMonths: number | null;
  coverageMonthsAdded: number | null;
  // Added 2026-09-24. Hide "Withdraw" on BUSINESS orders.
  buyerType: BuyerType;
  // Added 2026-09-24 (phase 4). The pinned breakdown; withdrawal.windowClosesAt is filled while the
  // order is PAID. Null on orders from before V106.
  breakdown: PriceBreakdown | null;
}

// ---------- Withdrawal (replaces the old admin-approved Refunds types, 2026-09-18) ----------
export type WithdrawalStatus = 'REFUSED' | 'HELD' | 'REFUNDED' | 'WITHHELD'; // WITHHELD: legacy since 2026-09-23
// 'PENDING' | 'APPROVED' | 'REJECTED' also exist on legacy rows migrated before this flow shipped;
// treat any status outside the four above as read-only history, never producible by a new request.

export type RefundBasis = 'CONSENTED_PRO_RATA' | 'NO_CONSENT_FULL_REFUND' | 'PRO_RATA_BY_TIME';
export type OrderKind = 'ACTIVATION' | 'UPGRADE' | 'STORAGE_PACK';

export interface WithdrawalRefusal {
  code: string;
  message: string;              // show verbatim
  detail: string | null;
}

export interface WithdrawalLine {
  orderId: string;
  orderKind: OrderKind;
  windowClosesAt: string | null;  // this order's own window (2026-09-23)
  basis: RefundBasis;
  hostingStart: string | null;
  hostingEnd: string | null;
  usedSeconds: number | null;
  totalSeconds: number | null;
  eventPerformed: boolean;
  keepEventDay: boolean;        // 2026-09-23; always false on a preview
  refundMinor: number;          // 0 on a released line whose order was already refunded another way
  providerRefunded: boolean;
  components: Record<string, unknown>;  // display-only breakdown; shape not enumerated here
  // 2026-09-24. BUSINESS only on a newer business upgrade taken along by a consumer upgrade's
  // withdrawal; it is refunded pro rata like a consented order.
  buyerType: BuyerType;
}

// An order an EVENT withdrawal leaves unrefunded because it was bought as a business (2026-09-24).
export interface WithdrawalExcludedOrder {
  orderId: string;
  orderKind: OrderKind;
  amountMinor: number;
  currency: string;
  reason: 'BUSINESS_PURCHASE';
}

// GET /api/events/{eventId}/withdrawal-preview — primary host. Nothing persisted; safe to call any time.
export interface WithdrawalPreview {
  eligible: boolean;
  refusals: WithdrawalRefusal[];
  windowClosesAt: string | null;        // null only on an EVENT preview with no settled activation
  totalRefundMinor: number;
  currency: string | null;              // null only on an EVENT preview with no settled activation
  lines: WithdrawalLine[];
  scheduleMovedAfterPayment: boolean;   // true → the withdrawal will be HELD for review; false promises nothing; always false on a pack
  // Added 2026-09-23 (§9, "one order"):
  scope: 'EVENT' | 'ORDER';
  orderId: string | null;
  instant: boolean;                     // true only for a storage pack in automatic mode
  storageAfter: { newLimitBytes: number | null; usageBytes: number;
                  overLimitBytes: number; trimDueAt: string | null } | null;   // ORDER only
  // Added 2026-09-24. EVENT only: business-bought upgrades and packs this withdrawal leaves
  // unrefunded. They go with the event. Empty on ORDER previews and on refusals.
  excludedOrders: WithdrawalExcludedOrder[];
}

// POST /api/events/{eventId}/withdrawals — primary host. Body optional: { reason?: string }.
// 201 with this shape when status is 'REFUNDED' or 'HELD'; a REFUSED outcome is instead a 409
// WITHDRAWAL_REFUSED with the standard error envelope, NOT this shape — read structured refusal
// reasons from WithdrawalPreview instead.
export interface WithdrawalResponse {
  id: string;
  eventId: string;
  scope: 'EVENT' | 'ORDER';      // added 2026-09-23
  orderId: string | null;
  status: WithdrawalStatus;
  reason: string | null;
  createdAt: string;
  decidedAt: string | null;
  decisionNote: string | null;
  holdUntil: string | null;
  totalRefundMinor: number | null;
  currency: string | null;
  refusals: WithdrawalRefusal[];
  lines: WithdrawalLine[];
  // Added 2026-09-24: what an EVENT withdrawal left unrefunded as business purchases, as it stood
  // when filed. Empty otherwise.
  excludedOrders: WithdrawalExcludedOrder[];
}

export interface WithdrawalRequest {
  reason?: string;               // max 1000 chars, optional
}

// GET /api/admin/withdrawals — admin. The facts sheet behind each HELD request (§9).
export interface WithdrawalFraudSignal {
  code: string;
  fired: boolean;
  observed: string;
  threshold: string;
}

export interface WithdrawalAdmin {
  request: WithdrawalResponse;
  usageFacts: Record<string, unknown> | null;   // display-only; null on a storage-pack request (never screened)
  fraudSignals: WithdrawalFraudSignal[]; // every signal evaluated, fired or not — show them all
  recommendation: string;                // generated plain text, render as-is
}

// POST /api/admin/withdrawals/{id}/release — admin. Body optional; see §9. (withhold removed 2026-09-23)
export interface WithdrawalRelease {
  keepEventDay: boolean;
  note?: string;                 // max 1000 chars; required when keepEventDay is true; shown to the host
}

// ---------- Admin metrics ----------
export interface PlatformMetricsResponse {
  totalUsers: number;
  activeUsers: number;
  usersByAccountPlan: Record<string, number>;

  totalEvents: number;
  activeEvents: number;
  eventsByStatus: Record<string, number>;   // keys: DRAFT | ACTIVE, missing = 0
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
// BREAKING: the three dunning types are deleted — there is no lapse left to warn a host about.
// BREAKING 2026-09-18: REFUND_APPROVED/REFUND_REJECTED replaced by the three WITHDRAWAL_* types —
// nothing emits the old pair any more (§10).
export type BillingNotificationType =
  | 'WITHDRAWAL_REFUNDED'
  | 'WITHDRAWAL_HELD'
  | 'WITHDRAWAL_WITHHELD'        // legacy since 2026-09-23
  | 'STORAGE_TRIM_SCHEDULED'     // 2026-09-23, ctaTarget EVENT_GALLERY
  | 'STORAGE_TRIM_WARNING';

// ---------- Config ----------
// Part of GET /api/config's aggregate response. Added 2026-09-18.
export interface AppWithdrawalConfig {
  termsVersion: string;   // pass back verbatim as ActivationCheckoutRequest.termsVersion
  windowDays: number;     // statutory withdrawal window, days after payment
  holdDays: number;       // how long a HELD request waits before auto-release
}
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

- Pricing / plan picker at event creation — `EVENT`-scope catalog, `sortOrder`, unlimited handling,
  and each plan's durations (`initialOptions`) to pick from.
- Draft event view — clearly "not published yet", with the `endAt` gate explained before the pay
  button. Include the module-unlock picker here (§7c) — it is only offered while `DRAFT`, and the
  running total should reflect it before the host pays. There is no "keep originals" toggle: every
  plan includes it (§7a).
- A storage-pack purchase UI on the plan-settings page (§7b) — pack picker + checkout button,
  rendering the raised ceiling on the usage bar once it settles.
- A plan-upgrade purchase UI on the same page (§7d) — one group per plan `upgrade-options` returns,
  one row per duration in it, each showing the price difference and the months it adds.
- Checkout success (polling, never asserting) and cancelled routes — shared by activation, upgrade
  and storage-pack checkout alike.
- `/events/{id}/settings/plan` — **required**; the destination of both refund notifications. Plan
  tier, order history, storage-pack and upgrade purchase entry points, refund section.
- Refund request dialog stating the event returns to `DRAFT`, plus the under-review and decision
  panels.

**Admin**

- Plan catalog CRUD, with archive preferred over delete, plus each `EVENT` plan's durations
  (`coverage-options`, §13).
- Paid-services catalog CRUD (§13) — same archive-first pattern, one screen covering the add-on,
  every storage pack, and every module unlock, filterable by `kind`. The `grantsStorageBytes` and
  `grantsModuleKey` fields appear and disappear with `kind`; drive the module picker from the
  registry, not a literal list. No `billingPeriod` picker is needed — it's fixed at `'ONE_TIME'`.
- Plan assignment for events, showing the returned usage snapshot. There is no working
  user/account-plan assignment control to build — that request always rejects (§13, Assignment).
- Manual order settlement, the unprocessed-webhook list, and webhook replay.
- Refund queue — evidence-first per §9, note fields labelled as host-visible, and a visible warning
  wherever `providerRefunded` is false.
- Entitlement removal (add-on/storage-pack), refused on any `ACTIVE` event.
- Platform module registry toggles.

**Global**

- `429` handling in the API client (§11), including refresh deduplication.
- The two refund notification types in the feed.

---

## 17. Not built — do not design against these

- **Invoices and receipts.** `orders` carries what was charged and when, and nothing else. No PDF, no
  invoice number, no billing address — the provider's own emails are the receipt.
- **A host-facing downgrade flow.** Upgrade only (§7d) — moving to a cheaper plan is refused with
  `PLAN_TIER_NOT_AN_UPGRADE`. Only admins can move an event onto a cheaper plan.
- **Partial refunds.** All-or-nothing on the activation order.
- **Refunding a storage pack.** Only `ACTIVATION` orders are ever requested for refund, and approving
  one also reverses a settled `UPGRADE` order automatically (§9) — but never a `STORAGE_PACK` order,
  which is final under every circumstance.
- **Downsizing storage.** A purchased storage pack never expires and cannot be sold back — the
  ceiling only ever goes up.
- **Selling "keep originals".** Retired 2026-09-23 (§7a). Every plan includes it, so there is no
  toggle, add-on or upsell to build.
- **Buying a module unlock for a live event.** DRAFT-only for the same structural reason (§7c). Don't
  put a buy-unlock button on a locked module on a live event; the only route open there is a plan
  upgrade (§7d).
- **Withdrawing a refund request.** A host cannot cancel a pending request; an admin has to reject
  it.
- **A host-visible refund SLA.** There is no "we respond within N days" value to display, and nothing
  surfaces the queue's depth.

Say so if the plan or refund screens need any of these. They are additions, not oversights.
