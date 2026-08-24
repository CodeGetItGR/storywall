# FE changes: module unlocks can be sold outright

**Read this if you have already built against `billing-fe-guide.md`.** That doc is updated in place
(§7c, §8, §13, the error table, the TS types) but it is long and most of it is unchanged. This is
only the delta.

No new endpoints. One response field added, one catalog field that stops being a constant, one
admin restriction.

---

## 0. The whole thing in one table

| # | what changed | your work |
|---|---|---|
| 1 | A `MODULE_UNLOCK` can now be priced `billingPeriod: "ONE_TIME"` — charged once on the activation, never on a renewal | price and label the two cadences differently in the unlock picker — §2 |
| 2 | **`billingPeriod` is a meaningful value again.** `storage-packs-recurring-fe-changes.md` §2 told you to delete branching on it — that advice is now wrong for unlocks | grep back for what you removed — §1 |
| 3 | `AddonSummary` gained `billingPeriod` — on `POST /addons` **and** `addons[]` in `GET /billing` | your monthly total must sum only the `MONTHLY` rows — §3 |
| 4 | A one-time unlock is **not** multiplied by `includedMonths`, and is charged even when `includedMonths` is `0` | fix any client-side activation-total preview — §2 |
| 5 | Admin: `billingPeriod` is no longer patchable once any event holds the service → `409 PAID_SERVICE_IN_USE` (5037) | disable that one control on a sold service — §5 |
| 6 | Admin: the create form should offer a cadence picker **only** for `MODULE_UNLOCK` | §5 |
| 7 | `POST /api/events/{eventId}/addons` — request shape, rate limit, DRAFT-only rule, every error code | **unchanged** — §6 |
| 8 | Module availability, the plan-vs-unlock OR gate, `isAvailable` | **unchanged** — §6 |
| 9 | Storage packs, `ORIGINALS`, plan tiers, renewals, refunds | **unchanged** — §6 |

---

## 1. Read this first if you followed the storage-packs guide

`storage-packs-recurring-fe-changes.md` §2 said, correctly at the time:

> In practice `billingPeriod` is now a constant across the whole catalog […] **If any code branches
> on `billingPeriod === 'ONE_TIME'`** […] that branch now silently stops firing. Grep for it.

**That is no longer true.** `ONE_TIME` is back as a real, load-bearing value — for `MODULE_UNLOCK`
rows only. If you took that advice and deleted the branching, you need some of it back, and the
failure mode if you don't is a UI that labels a one-time unlock "€3/month" and shows it on a renewal
breakdown the host will never be charged.

What has *not* changed is the other half of that advice: **`kind` is still the right signal for
"which endpoint buys this"**, and `billingPeriod` is the right signal for "how is it charged". They
answer different questions — use both:

```ts
// which endpoint / which screen
service.kind === 'STORAGE_PACK'   // live event, real checkout
service.kind === 'MODULE_UNLOCK'  // draft only, folds into activation

// how to price and label it
service.billingPeriod === 'ONE_TIME' ? `${price} once` : `${price}/month`
```

Storage packs and `RECURRING_ADDON` are still always `MONTHLY` and always will be — both grant
something that costs money for as long as it is held. A module left switched on doesn't, which is
why it is the one kind that can be sold outright.

---

## 2. The two cadences, and what each one costs

Catalog rows come from `GET /api/config` → `paidServices[]`, unchanged in shape. For a
`kind: 'MODULE_UNLOCK'` row, `billingPeriod` is now either value:

```jsonc
{
  "code": "UNLOCK_WISHLIST",
  "kind": "MODULE_UNLOCK",
  "name": "Gift Wishlist",
  "priceAmountMinor": 300,
  "priceCurrency": "EUR",
  "billingPeriod": "ONE_TIME",       // ← or "MONTHLY"; read it, don't assume
  "grantsStorageBytes": null,
  "grantsModuleKey": "wishlist"
}
```

| `billingPeriod` | Added to the activation | On every renewal after |
|---|---|---|
| `'MONTHLY'` | `priceAmountMinor × plan.includedMonths` | `priceAmountMinor` |
| `'ONE_TIME'` | `priceAmountMinor` — flat | nothing |

Two traps in that table, both in the one-time row:

- **No `× includedMonths`.** The event's length says nothing about the price of a feature. If you
  preview the activation total client-side, applying the §7a formula uniformly overcharges the
  preview against what the server actually quotes.
- **The `includedMonths: 0` exemption does not apply.** A monthly add-on on a plan with no included
  window is charged nothing at activation (there is no month to charge for); a one-time unlock on
  the same plan is still charged in full. It is the only add-on line that survives that case.

### Label them differently

"€3/month" and "€3 once" are different offers and the host is making a different decision. A
one-time unlock is the more expensive-looking line on the activation total and the cheaper one over
the life of the event — a picker that prices both the same way makes that impossible to see. If a
catalog contains both cadences at once, sort or group them, don't interleave silently.

Nothing about the *mechanics* of buying changes: same `POST /api/events/{eventId}/addons`, same
DRAFT-only rule, same "nothing is charged at this moment", same toggle-not-a-purchase-button
rendering. Only the price you print next to it.

---

## 3. `AddonSummary` gained `billingPeriod`

Returned by `POST /api/events/{eventId}/addons` and in `addons[]` on `GET /api/events/{id}/billing`:

```ts
export interface AddonSummary {
  code: string;
  name: string;
  /** What this costs at `billingPeriod`'s cadence — NOT necessarily a monthly figure. */
  priceAmountMinor: number;
  /** NEW. 'MONTHLY' | 'ONE_TIME'. Only a MODULE_UNLOCK is ever 'ONE_TIME'. */
  billingPeriod: BillingPeriod;
  activatedAt: string;
}
```

```jsonc
// GET /api/events/{eventId}/billing
"addons": [
  { "code": "ORIGINALS",       "name": "Keep Originals", "priceAmountMinor": 500,
    "billingPeriod": "MONTHLY",  "activatedAt": "2026-08-01T10:00:00Z" },
  { "code": "UNLOCK_WISHLIST", "name": "Gift Wishlist",  "priceAmountMinor": 300,
    "billingPeriod": "ONE_TIME", "activatedAt": "2026-08-01T10:00:00Z" }
]
```

**The renewal formula changes.** `storage-packs-recurring-fe-changes.md` §3 told you to sum the
whole array:

```
# was
next renewal quote = plan.recurringPriceAmountMinor + Σ addons[].priceAmountMinor

# now
next renewal quote = plan.recurringPriceAmountMinor
                   + Σ addons[] where billingPeriod === 'MONTHLY' → priceAmountMinor
```

Summing the whole array now overstates the renewal by the price of every one-time unlock the event
owns. This matches what the server computes for `startRenewal` and for live-subscription repricing —
so **if your renewal total comes from the server rather than being recomputed client-side, you are
already correct and there is nothing to do here.** Worth the five-minute check against a test event
that holds a one-time unlock.

A one-time row appears in this array because **the host owns it**, not because they owe it. That is
the useful thing about it: it is how you render "what you're paying for" versus "what you have".
Consider splitting the list — a recurring section that feeds the monthly total, and an owned/"paid
for" section that doesn't.

---

## 4. What to build, screen by screen

**Draft setup wizard — the unlock picker.** The only place a one-time unlock can be bought. Price
each entry from its own `billingPeriod`. Unchanged: filter on `planTierIds` (empty means every
plan), join `grantsModuleKey` against `GET /api/config` → `modules[]` for display copy, and render
it as a toggle rather than a purchase button since nothing is charged on the call.

**Activation checkout screen.** If you itemise the total, a one-time unlock is one flat line; a
monthly one is `price × includedMonths`. Both land inside the order's `addonAmountMinor`, which
remains a single combined number — there is no server-side per-line breakdown to read, so if you
need one, build it from the event's `addons[]` plus the plan's `includedMonths`.

**Post-activation billing screen.** Split monthly from owned, per §3.

**Live event, module unavailable.** Unchanged, and still the important limitation: there is **no**
buy affordance. `POST /addons` is DRAFT-only and `409 EVENT_NOT_DRAFT` (5017) is what a live event
gets. For a one-time unlock this is stricter than it looks — the activation is the only thing that
ever charges it, so there is no later payment that could pick it up. The way out is still a plan
upgrade onto a tier whose `moduleKeys` include the key (§4/§6 of the main guide).

---

## 5. Admin panel

### Cadence picker, only for unlocks

`billingPeriod` on create/patch is enforced against `kind`:

| `kind` | accepted | anything else |
|---|---|---|
| `STORAGE_PACK` | `MONTHLY` | `400 VALIDATION_FAILED` (3001) |
| `RECURRING_ADDON` | `MONTHLY` | `400 VALIDATION_FAILED` (3001) |
| `MODULE_UNLOCK` | `MONTHLY` **or** `ONE_TIME` | `400 VALIDATION_FAILED` (3001) |

`YEARLY` is rejected everywhere — nothing in the platform bills yearly. So: show a real picker when
`kind` is `MODULE_UNLOCK`, and derive `MONTHLY` silently otherwise.

### It is not editable once the service has been sold

```jsonc
// 409 on PATCH /api/admin/paid-services/{id} with a changed billingPeriod
{
  "status": 409,
  "detail": "Cannot change billingPeriod on UNLOCK_WISHLIST: 12 event(s) already hold it, and what they were charged cannot be rewritten. Archive it with isAssignable=false and create a new service at the new billing period instead.",
  "errorCode": 5037,
  "errorKey": "PAID_SERVICE_IN_USE"
}
```

| code | HTTP | when | what to show |
|---|---|---|---|
| `5037` `PAID_SERVICE_IN_USE` | 409 | patching `billingPeriod` on a service any event holds — or deleting a referenced service, as before | admin-facing; not retryable — surface the archive-and-republish route |

The reason, worth putting in a tooltip because it will be asked: the field decides whether an
entitlement an event *already holds* keeps being charged, and both directions are silently wrong.
`MONTHLY → ONE_TIME` stops billing events that were only ever charged monthly, with no one-time
charge to replace it — they are long past their activation. `ONE_TIME → MONTHLY` starts billing
events that paid outright, on their next renewal, for a change they were never told about. The
correct answer differs per event depending on what that event already paid, so no single edit is
right.

**Every other field still patches normally on a held service** — name, description, price,
sortOrder, flags, `planTierIds`. Disable this one control once the service has entitlements against
it, not the whole form. (Note the existing separate warning on `grantsModuleKey`: repointing it *is*
retroactive and takes the old module away from everyone who bought it. Different field, different
hazard, both worth a confirm step.)

---

## 6. Explicitly unchanged — nothing to build

Listed so they don't cause double-checking.

- **`POST /api/events/{eventId}/addons`** — request body (`paidServiceCode`), host-only, rate limit
  30/min, DRAFT-only, and every error code in §7c's table: `EVENT_NOT_DRAFT` (5017),
  `ADDON_ALREADY_ACTIVE` (5038), `INVALID_PAID_SERVICE_KIND` (3015), `RESOURCE_NOT_FOUND` (2001),
  `PAID_SERVICE_NOT_PURCHASABLE` (5036), `PAID_SERVICE_NOT_ON_PLAN` (5040), `FORBIDDEN` (4001). The
  response body gained one field (§3); nothing else moved.
- **Module availability.** The plan-lists-it OR holds-an-unlock gate, the platform kill switch, the
  host's per-event toggle, `isAvailable`, `MODULE_NOT_AVAILABLE` (5012) — all identical. A one-time
  unlock grants exactly what a monthly one grants; the cadence is a billing fact, not an
  entitlement fact.

  **One new trigger for that same 5012, unrelated to cadence:** `POST /addons` now also refuses a
  `MODULE_UNLOCK` outright — before the plan or entitlement checks even run — when the event's
  `eventType` doesn't support the module at all (see `event-lifecycle-locks-and-event-types-fe-integration.md`
  §3). A wishlist unlock offered to a `SOCIAL_EVENT`, for example, 409s here even though the catalog
  row itself is perfectly purchasable. The picker in §4 should already prevent this by only listing
  unlocks for modules the event's type actually has a row for (`GET /api/events/{eventId}/modules`),
  same as it already has to filter on `planTierIds` — but if you build the picker from the raw
  catalog instead, this is the gap that bites.
- **Existing catalog rows.** Every seeded and admin-created service is still `MONTHLY` and bills
  exactly as it did. `ONE_TIME` is opt-in per row, chosen at creation. Nothing was migrated.
- **`PaidServiceResponseDto`** — same fields. Only the range of values `billingPeriod` can hold
  widened, and only on `MODULE_UNLOCK`.
- **Storage packs and `ORIGINALS`** — untouched. Still `MONTHLY`, still summed into every renewal,
  still bought through their existing routes.
- **Plan tiers.** `billingPeriod` on a `PlanTier` is a separate field with separate rules (`ONE_TIME`
  for EVENT scope, `MONTHLY` for ACCOUNT) and is unaffected by any of this.
- **Refunds, coverage, freeze/purge, subscriptions.** No change. Note one consequence: a refund that
  reverts an event to `DRAFT` leaves the entitlement in place, so re-activating charges a one-time
  unlock again — the same way it re-charges the plan.

---

## 7. Checklist

- [ ] Restore `billingPeriod` branching for `MODULE_UNLOCK` rows if you deleted it after the
      storage-packs guide (§1).
- [ ] Price the unlock picker from each row's own `billingPeriod`; label "€X once" vs "€X/month".
- [ ] Drop the `× includedMonths` multiplier for one-time rows in any client-side activation-total
      preview, and make sure `includedMonths: 0` still charges them.
- [ ] Change the renewal-quote sum to filter `addons[]` on `billingPeriod === 'MONTHLY'` — or
      confirm the total comes from the server, in which case you're done.
- [ ] Consider splitting the billing screen's add-on list into "recurring" and "owned".
- [ ] Admin: show the cadence picker only for `MODULE_UNLOCK`; derive `MONTHLY` for the other kinds.
- [ ] Admin: disable the cadence control on a service that has entitlements, and handle
      `409 PAID_SERVICE_IN_USE` (5037) on `PATCH` as an expected response, not a generic error.
- [ ] Spot-check a draft that holds a one-time unlock: activation quote includes it once, and the
      renewal quote afterwards does not include it at all.
