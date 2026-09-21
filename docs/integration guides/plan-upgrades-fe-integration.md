# FE integration guide: plan upgrades

Covers the upgrade work shipped 2026-08-08. See `billing-fe-guide.md` for the consolidated billing
reference — this doc only covers what upgrades add on top, and **its §12 error table and §14 types
do not yet include the changes below**.

**2026-09-01 update:** §3's picker-building guidance is superseded — a new endpoint now returns
every upgrade target already fully priced, discount codes included. See §3.

**The headline change: there is now a third purchase.** Until now an event's plan was fixed at
creation and could only be changed by an admin, bypassing billing entirely. A host on `BASIC` who
hit a storage wall had no self-serve route to `PLUS` — which was awkward, because the
`UPGRADE_OFFER` notification has always shipped with a "See upgrade options" CTA pointing at
nothing.

---

## 1. The mental model

| purchase | what it buys | changes coverage? |
|---|---|---|
| **Activation** (one-time) | the event goes live, plus storage until `endAt` + `includedMonths` | ✅ sets it |
| **Preservation** (monthly) | keeps the media online after that window | ✅ extends it |
| **Upgrade** (one-time) — *new* | **a higher ceiling on the same event** | ❌ **never** |

**An upgrade buys ceiling, not time.** It widens `storageBytes` and `maxMembers` from the moment it
settles and deliberately leaves `paidThrough` exactly where it was. The months already bought are
the months they keep.

Two consequences worth internalising before you build the screen:

- **Priced as the difference**, not the full price of the target plan. `PLUS` (200.00) from `BASIC`
  (100.00) costs 100.00, because the host already paid for the tier below.
- **A longer `includedMonths` on the target plan does not extend anything.** If `BASIC` includes 3
  months and `PRO` includes 12, upgrading to `PRO` does **not** buy 9 more. Do not imply otherwise
  in the comparison table — it is the single most likely place to write copy the server won't honour.

### Not supported

- **Downgrades.** There is no mechanism to hand storage back, and an event already over the lower
  tier's limits would be instantly non-compliant. Cheaper *and* equal-priced targets are refused.
- **Changing a `DRAFT`'s plan.** Nothing has been paid, so there is no difference to charge. The
  endpoint returns `5014` on a draft. There is currently **no** way to change a draft's plan at all
  — not via upgrade and not via `PATCH /api/events/{id}`. If a host picks the wrong tier before
  paying, their only route today is to delete the draft and create a new one. Worth knowing before
  you design the draft screen around a plan switcher that does not exist.

---

## 2. `POST /api/events/{eventId}/upgrade-checkout` — host

```http
POST /api/events/{eventId}/upgrade-checkout
Authorization: Bearer <jwt>
Content-Type: application/json

{ "planTierCode": "PLUS" }
```

**The only checkout in the API that takes a body**, and only to name a plan. Every price and
currency still comes from a catalog row, so there is no amount for a client to tamper with — sending
one is not possible, and the difference is recomputed server-side regardless of what you display.

Host-only (co-hosts count; `403` otherwise).

```jsonc
// 200 — identical shape to the other two checkouts
{
  "orderId": "3cf8fc63-…",
  "redirectUrl": "https://checkout.stripe.com/c/pay/cs_test_…"
}
```

Then `window.location.href = redirectUrl`. Same rules as activation: **no iframe, no popup** — the
hosted page sets frame-ancestor headers and 3DS/SCA needs a real top-level navigation.

### Rate limiting shares a bucket

The limit is `checkout.start`, 10/min — **the same bucket as activation and subscription checkout**,
keyed per user. A host who opens and abandons upgrade checkouts burns the allowance for starting an
activation too. Disable the button while in flight; handle `429` the way §11 of the consolidated
guide already describes.

### Changing the target closes the previous order

Open an upgrade to `PLUS`, then to `PRO`, and the `PLUS` order is `CANCELLED` and a new one issued.
This differs from activation, where a repeat call reuses the same order and returns the same session.
**Always use the `orderId` from the most recent response** — a stale one may now be cancelled, and
paying the `PLUS` order would have moved the event to `PRO`.

---

## 3. Building the picker

**2026-09-01 update: don't compute the picker's prices yourself any more.** Everything below this
line describes the *old* approach and is kept only so you recognise it if you find it in existing
code — a client-side `target - current` subtraction predates discount codes and was already wrong
about plan promotions; now that a partner/house code bound at activation also carries over to an
upgrade unretyped (see `collaborations-fe-integration.md` for that feature), it can be wrong by more
than a rounding cent.

Use `GET /api/events/{eventId}/upgrade-options` instead — one call, host-only, no code involved:

```jsonc
→ 200
[
  {
    "planTierCode": "PRO", "planTierName": "Pro", "currency": "EUR",
    "gapAmountMinor": 10000,      // undiscounted difference — fine for a "was €100" strike-through
    "payableAmountMinor": 8000,   // what upgrade-checkout will actually charge — render this as the price
    "discountPercent": 20,        // combined plan-promo + bound-code percent; absent when nothing discounts this target
    "discountLabel": "Barn Venue partner rate"  // absent when discountPercent is absent
  }
]
```

Already filtered to valid targets (public, assignable, offered for this event type, priced above the
current plan, same currency) and already sorted by catalog order — render the array as-is. See
`collaborations-fe-integration.md` §1c for the full contract, including why `payableAmountMinor` can
never disagree with what `POST /upgrade-checkout` then charges.

<details>
<summary>Old approach (pre-2026-09-01) — do not use for new code</summary>

Read the catalog from `GET /api/config` → `planTiers` (already filtered to `isAssignable &&
isPublic`), and the event's current plan from `GET /api/events/{eventId}/billing` → `planTierCode`.

```ts
function upgradeTargets(catalog: PlanTierResponse[], current: PlanTierResponse) {
  return catalog.filter(p =>
    p.scope === 'EVENT' &&
    p.code !== current.code &&
    p.priceAmountMinor !== null && current.priceAmountMinor !== null &&
    p.priceCurrency === current.priceCurrency &&          // cross-currency is refused (5030)
    p.priceAmountMinor > current.priceAmountMinor         // strictly above (5029)
  ).sort((a, b) => a.sortOrder - b.sortOrder);
}

// Wrong as of 2026-09-01: ignores the target plan's own promotion and any bound discount code.
const differenceMinor = target.priceAmountMinor! - current.priceAmountMinor!;
```

</details>

Suggested copy: *"Upgrade to Plus — €100 now. Your coverage still runs to 14 March 2027."* Naming the
unchanged date in the same sentence as the price is the clearest way to stop the host expecting more
time.

---

## 4. The return routes and settling

Upgrade reuses **the same two routes** as the other checkouts — nothing new to add to the router:

| route | meaning |
|---|---|
| `/events/{eventId}/checkout/success` | the host completed the hosted page |
| `/events/{eventId}/checkout/cancelled` | the host backed out; nothing charged, nothing to clean up |

**Success still does not mean paid.** Poll `GET /api/events/{eventId}/billing` and watch your own
order, exactly as §6 step 5 of the consolidated guide describes.

The one difference: **an upgrade never changes `eventStatus`.** The event was `ACTIVE` before and is
`ACTIVE` after. Watch the order — and, if you want to confirm the tier landed, `planTierCode`:

```ts
// on /events/:id/checkout/success, for an upgrade order
const settled = await pollUntil(
  () => api.get(`/api/events/${id}/billing`).then(b => {
    const order = b.orders.find(o => o.id === orderId);
    return order?.status === 'PAID' && b.planTierCode === targetCode;
  }),
  { intervalMs: 1500, timeoutMs: 30_000 }
);
```

On timeout, show "still processing" — never "failed". A lost webhook is reconciled by a sweep within
~15 minutes.

### What settlement actually changes

1. `planTierCode` on the billing response moves to the target.
2. Quotas widen immediately — `GET /api/events/{id}/usage` returns the new `storageLimitBytes` and
   `memberLimit`. **Refetch usage after an upgrade settles**, or your progress bars keep showing the
   old denominator.
3. `coverage` is **unchanged**. Do not show a "coverage extended" toast.
4. A live subscription is repriced onto the new tier — see §6.

---

## 5. Two shape changes that will break naïve clients

### `OrderKind` gained a third value

```ts
export type OrderKind = 'ACTIVATION' | 'RENEWAL' | 'UPGRADE';   // was two
```

Any exhaustive `switch`, lookup map, or icon/label table keyed on `kind` needs an `UPGRADE` arm.
Order history is the obvious place. Suggested label: *"Upgrade to Plus"*.

### `coversFrom` / `coversUntil` are genuinely null on some paid orders

They were already typed nullable, but until now a `PAID` order always had both. That is no longer
true, in two cases:

- **Every `UPGRADE` order** — a database constraint forbids it a window, because coverage is
  `max(coversUntil)` across paid orders and a value here would silently hand out months nobody paid
  for.
- **Some `RENEWAL` orders** — a subscription's monthly charge is recorded so it stays refundable,
  and it carries a window only when the provider reported a period end still in the future. The
  subscription row carries that month's coverage instead.

So an order row rendering `Covers {coversFrom} → {coversUntil}` will now print `null → null`.

```tsx
// Right
{order.coversUntil
  ? <>Covers through {formatDate(order.coversUntil)}</>
  : order.kind === 'UPGRADE'
    ? <>Plan upgrade — no change to coverage</>
    : <>Recorded charge</>}
```

---

## 6. The subscription after an upgrade — the case you must handle

An event with a live preservation subscription is billing at the **old** tier's monthly price. On
settlement the server tries to reprice it in place. Two outcomes, and the FE sees them differently:

**Repriced (Stripe, the normal path).** Same subscription, same period, same card, nothing lapses.
`subscription` on the billing response is unchanged apart from continuing to run. Nothing to show.

**Could not be repriced (provider refused, or a provider without the capability).** The subscription
is set to stop at the end of the period already paid for. You will see:

```jsonc
"subscription": {
  "status": "ACTIVE",           // still active — that month was paid for and still counts
  "cancelAtPeriodEnd": true,    // ← the signal
  "currentPeriodEnd": "2026-09-07T…"
}
```

**This is the one state that needs host action.** Their auto-renewal will lapse on
`currentPeriodEnd` unless they start a new subscription at the new tier. Prompt for it:

> *"Your preservation subscription ends 7 September. Restart it to keep your photos online at the
> Plus rate."* → `POST /api/events/{id}/subscription-checkout`

Note the ambiguity you have to live with: `cancelAtPeriodEnd: true` also means *the host asked to
cancel* (§7 of the consolidated guide). `SubscriptionSummary` does not expose the subscription's own
plan tier, so the response alone cannot tell the two apart. The practical rule: if you have just
settled an `UPGRADE` order and the subscription comes back `cancelAtPeriodEnd: true`, treat it as
the fallback and prompt. Otherwise treat it as a host-requested cancellation.

---

## 7. Error codes

Two new, and four existing ones reachable from a path that could not produce them before.

| code | HTTP | when | what to show |
|---|---|---|---|
| `5029` `PLAN_TIER_NOT_AN_UPGRADE` | 409 | target is the current plan, cheaper, or equally priced | should be unreachable if §3 filters correctly — treat as a stale catalog and refetch `/api/config` |
| `5030` `PLAN_TIER_CURRENCY_MISMATCH` | 409 | the two plans are priced in different currencies | not a host-fixable problem; "This plan isn't available for your event" + log it |
| `5014` `EVENT_NOT_ACTIVE` | 409 | upgrade attempted on a `DRAFT` | send to activation instead |
| `5015` `PLAN_TIER_NOT_PURCHASABLE` | 409 | target archived or made non-public since page load | refetch `/api/config`, re-render the picker |
| `5019` `PLAN_TIER_NOT_PRICED` | 409 | either plan has no one-time price configured | "This plan isn't available right now"; a catalog misconfiguration |
| `5021` `PLAN_TIER_CURRENCY_UNSUPPORTED` | 409 | target priced in a currency we cannot charge | same as above |

Also reachable: `404` for an unknown `planTierCode` (or an event that does not exist / is deleted),
`403` for a non-host, `400` for a missing or over-length `planTierCode`, and `429` on the shared
checkout bucket.

`5029` and `5015` are both "your picker is out of date" — the correct response to either is a
catalog refetch, not an error dialog.

---

## 8. TypeScript

```ts
// ---------- Changed ----------
export type OrderKind = 'ACTIVATION' | 'RENEWAL' | 'UPGRADE';   // 'UPGRADE' is new

// ---------- New ----------
export interface UpgradeCheckoutRequest {
  planTierCode: string;         // EVENT-scope code, max 50 chars
}

// Response is the existing CheckoutResponse — { orderId, redirectUrl }

// ---------- Client ----------
export async function startUpgrade(eventId: string, planTierCode: string) {
  return api.post<CheckoutResponse>(
    `/api/events/${eventId}/upgrade-checkout`,
    { planTierCode } satisfies UpgradeCheckoutRequest,
  );
}
```

---

## 9. Known gaps

Neither is a bug you can work around client-side; both are listed so you do not design around
behaviour that does not exist.

- **A refunded or disputed upgrade leaves the event on the upgraded tier.** Reversing an order clears
  coverage but does not revert plans, and the refund flow only targets `ACTIVATION` orders anyway —
  so an upgrade is effectively non-refundable through the host-facing refund UI. Do not offer a
  refund button on an `UPGRADE` order row; `GET /refund-eligibility` speaks only to the activation.
- **A draft's plan cannot be changed.** See §1.
