# FE changes: storage packs are now recurring

**Read this if you have already built against `billing-fe-guide.md`.** That doc has been updated in
place (§7b, §13, the error table, the TS types) but it is long and most of it is unchanged. This is
only the delta.

No new endpoints. One catalog field flips value, one new addon-array behaviour, one new error code.

---

## 0. The whole thing in one table

| #   | what changed                                                                                              | your work                                                                      |
| --- | --------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| 1   | Storage packs are no longer a one-time deposit — their price now recurs on every renewal                  | mention of "one-time" anywhere in your storage-pack UI copy is now wrong — §1  |
| 2   | `PaidServiceResponse.billingPeriod` for a `STORAGE_PACK` catalog row is now `"MONTHLY"`, not `"ONE_TIME"` | fix anything that branches on this value — §2                                  |
| 3   | `GET /billing`'s `addons[]` array can now contain storage-pack rows, not just `ORIGINALS`                 | your renewal-cost breakdown must sum the whole array, not assume one kind — §3 |
| 4   | Buying a pack while a subscription is live reprices it immediately                                        | nothing to build — informational, may explain a support ticket — §3            |
| 5   | `409 ADDON_LOCKED_WHILE_ACTIVE` (5042) — admin entitlement removal now refused on any `ACTIVE` event      | new case in the admin panel's error handling — §4                              |
| 6   | The admin "remove add-on" tool is no longer usable on a live event **at all**, including `ORIGINALS`      | update any admin copy that implied it always works — §4                        |
| 7   | `Event.extraStorageBytes`, `GET /usage`, `GET /admin/metrics` storage fields                              | **unchanged** — nothing to do — §5                                             |
| 8   | `POST /storage-checkout` request/response, refund rules                                                   | **unchanged** — nothing to do — §5                                             |

---

## 1. What actually changed

A storage pack (`STORAGE_5GB` / `STORAGE_20GB` / `STORAGE_50GB`) used to be a true one-time
purchase: pay once, the ceiling goes up forever, the platform absorbs the ongoing cost of storing
that extra data for as long as the event lives. That gap is now closed — a settled pack folds into
the event's monthly preservation subscription exactly the way the "Keep Originals" add-on already
does. The byte ceiling is still permanent and non-refundable; the **price** now recurs alongside it.

Nothing changes about _buying_ one — same button, same checkout, same one-time Stripe Checkout
Session. What changed is what settlement does afterwards:

- it grants a recurring entitlement (an `EventAddon` row) in addition to raising the byte ceiling,
  the same mechanism `ORIGINALS` already uses, so it now shows up in `GET /billing`'s `addons[]`
  (§3) and is priced into every future renewal quote;
- if the event already has a live subscription running, that subscription is repriced **in place,
  immediately** — the host's next invoice reflects the new total with no separate action from
  either side.

**Find and fix any copy that says a storage pack is "one-time," "a single charge," or similar.** It
now behaves like the add-on: bought once, billed monthly from then on. The point-of-purchase screen
is the one place this absolutely must be accurate — a host who buys expecting a single deposit and
then sees it on every renewal invoice is going to file a ticket.

---

## 2. The catalog field flip

```ts
export type BillingPeriod = 'MONTHLY' | 'YEARLY' | 'ONE_TIME';

export interface PaidServiceResponse {
    code: string;
    kind: 'STORAGE_PACK' | 'RECURRING_ADDON';
    billingPeriod: BillingPeriod; // ← was 'ONE_TIME' for STORAGE_PACK, now always 'MONTHLY'
    priceAmountMinor: number;
    priceCurrency: string;
    grantsStorageBytes: number | null;
    // …
}
```

Returned from `GET /api/config` (`paidServices[]`) and the admin catalog endpoints. Every
`STORAGE_PACK` row now reads `billingPeriod: "MONTHLY"` — the same value `RECURRING_ADDON` rows
already used. In practice `billingPeriod` is now a constant across the whole catalog (both kinds
require `MONTHLY`; the API still models it as a real field rather than dropping it, since a
different cadence is a validated, enforced value, not just an unread label).

**If any code branches on `billingPeriod === 'ONE_TIME'`** — e.g. to label a pack "one-time" in a
pricing table, or to skip putting it in a "recurring costs" summary — that branch now silently stops
firing for storage packs. Grep for it. The safer signal, if you need to distinguish a pack from the
add-on for UI purposes (icon, copy), is `kind === 'STORAGE_PACK'`, not `billingPeriod`.

Admin catalog create/patch validation is unaffected by this beyond the enforcement itself: the admin
form should simply stop offering `ONE_TIME` as a choice for `STORAGE_PACK` (it will `400
VALIDATION_FAILED` if submitted) — see `billing-fe-guide.md` §13.

---

## 3. Storage packs now appear in `GET /billing`'s `addons[]`

```http
GET /api/events/{eventId}/billing
```

```jsonc
{
  …,
  "addons": [
    { "code": "ORIGINALS", "name": "Keep Originals", "priceAmountMinor": 500,
      "activatedAt": "2026-08-01T10:00:00Z" },
    { "code": "STORAGE_5GB", "name": "+5 GB Storage", "priceAmountMinor": 500,
      "activatedAt": "2026-08-10T14:22:00Z" }
  ]
}
```

**The shape is identical to an `ORIGINALS` entry — `code`, `name`, `priceAmountMinor`,
`activatedAt`, nothing more.** There is no `kind` field on this array to tell them apart
programmatically; if your renewal-cost breakdown needs to label a line as "storage" vs "add-on", key
off `code` against the known storage-pack codes (`STORAGE_5GB`/`STORAGE_20GB`/`STORAGE_50GB`) or
match `code` against the `paidServices` catalog you already have from `GET /api/config`.

**If your renewal-cost UI previously assumed this array only ever contains `ORIGINALS`** (e.g. a
single hardcoded "Keep Originals: €5/mo" line rather than iterating the array), that assumption is
now wrong for any event that has ever bought a pack. Sum the whole array:

```
next renewal quote = plan.recurringPriceAmountMinor + Σ addons[].priceAmountMinor
```

This matches what `applyPlanChange` computes server-side for live-subscription repricing, and what
`startRenewal` computes for a manual renewal checkout — both already summed `addons[]` for
`ORIGINALS`, so if your renewal total already came from the server (rather than being independently
recomputed client-side) this may already be correct with zero changes. Worth a five-minute check
against a test event that has bought a pack.

Buying two different packs, or the same pack twice, both stack rather than replace — expect multiple
rows with the same `code` if a host buys `STORAGE_5GB` twice. Sum still applies uniformly.

### Live repricing has no separate signal

If a host buys a pack while a subscription is already running, the reprice happens server-side as
part of settlement — there is nothing to poll for and no new field indicating it happened. The
existing post-checkout polling flow (`billing-fe-guide.md` §6 steps 3–5) already covers this: once
the order shows `PAID`, everything — the byte ceiling, the `addons[]` entry, and the live
subscription's price — is already consistent. This is mentioned only so a "why did my invoice amount
change without me doing anything on the billing page" support question has a documented answer.

---

## 4. Admin: entitlement removal is now refused on any `ACTIVE` event

```http
DELETE /api/admin/events/{eventId}/addons/{paidServiceCode}
```

This endpoint is unchanged in shape (still admin-only, still takes a catalog code, still `204` on
success) but its behaviour is now much narrower. **Once an event is `ACTIVE`, this call always
fails** — for a storage pack, for `ORIGINALS`, for anything. Paying for an entitlement is now
permanent for the life of the event; the only way it lapses is the event itself lapsing (frozen for
non-payment, then purged). This closes a real gap: previously an admin removing an entitlement from
a still-paying, still-live event silently stopped billing for it without deleting anything it was
covering — this endpoint now refuses rather than allow that state.

```jsonc
// 409
{
    "type": "about:blank",
    "title": "Conflict",
    "status": 409,
    "detail": "Event <id> is ACTIVE; paid entitlements cannot be removed while it is live. They lapse with the event itself.",
    "instance": "/api/admin/events/<id>/addons/<code>",
    "errorCode": 5042,
    "errorKey": "ADDON_LOCKED_WHILE_ACTIVE",
}
```

| code                               | HTTP | when                                                                                     | what to show                                                                                                                       |
| ---------------------------------- | ---- | ---------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `5042` `ADDON_LOCKED_WHILE_ACTIVE` | 409  | removing any entitlement from an event whose `status` is `ACTIVE`                        | admin-facing; not retryable as-is — "Can't be removed while the event is live. It lapses automatically if the event stops paying." |
| `5041` `ADDON_NOT_ACTIVE`          | 409  | the event never had this entitlement (unchanged, still reachable on non-`ACTIVE` events) | admin-facing; refetch the event's add-ons                                                                                          |

**This is a behaviour change on an endpoint that used to always succeed for a valid code/event
pair.** If the admin panel has a "remove" button next to every entitlement row unconditionally, it
will now 409 on any live event — which today is nearly every event that has one, since entitlements
are almost always bought after activation. Two reasonable fixes, pick one:

- Gate the button on `event.status !== 'ACTIVE'` (you likely already have event status in the admin
  event view) and show it disabled/hidden otherwise, with a tooltip explaining why.
- Leave the button as-is and handle `5042` explicitly rather than as a generic error — it's an
  expected, common response now, not an edge case.

The tool still works exactly as before on an event that has left `ACTIVE` — e.g. `DRAFT` after an
approved activation refund reverts it. That remains its only real use case going forward: cleaning up
after a refund, not a routine "take this feature away" action on a live event.

---

## 5. Explicitly unchanged — nothing to build

Listed so they don't cause double-checking.

- **`POST /api/events/{eventId}/storage-checkout`** — request body (`paidServiceCode`), response
  (`orderId`, `redirectUrl`), rate limit, error codes for an unknown/wrong-kind/not-purchasable code
  — all identical. Still opens a plain one-time Stripe Checkout Session under the hood; only what
  settlement does afterwards changed.
- **`GET /api/events/{eventId}/usage`** — `extraStorageBytes`, `planStorageBytes`,
  `storageLimitBytes`, `storagePercent` are all untouched. `extraStorageBytes` keeps its exact
  current meaning (lifetime total ever granted by settled packs) and is not derived from the new
  `EventAddon` rows.
- **`GET /api/admin/metrics`** — `storage.committedBytes` and `storage.purchasedExtraBytes` are
  still computed from `Event.extraStorageBytes`/plan limits, not from the new entitlement rows.
  Unaffected.
- **Refunds.** A storage pack is still never refundable through the refund-request flow — that path
  only ever reverses the activation order, and packs were already excluded from it. No change.
- **Downsizing.** Still impossible. A pack's byte ceiling only ever goes up, same as before —
  §4's new removal restriction makes this even more absolute (an admin could theoretically remove
  one from a non-`ACTIVE` event before; whether that's ever actually done is unchanged).

---

## 6. Checklist

- [ ] Remove/replace any "one-time" wording on the storage-pack purchase UI.
- [ ] Stop branching on `billingPeriod === 'ONE_TIME'` for storage packs; use `kind` instead if you
      need to distinguish pack from add-on in the UI.
- [ ] Confirm your renewal-cost breakdown sums the whole `addons[]` array rather than assuming it's
      only ever `ORIGINALS`.
- [ ] Handle `409 ADDON_LOCKED_WHILE_ACTIVE` (5042) in the admin panel's entitlement-removal flow —
      gate the button on event status, or handle the error explicitly.
- [ ] Update any admin copy claiming entitlement removal "always works" — it's now a `DRAFT`-only
      (post-refund) correction tool.
- [ ] Spot-check a test event that bought a pack: `GET /billing` shows it in `addons[]`, and if a
      subscription is live, its price is already folded into the total.
