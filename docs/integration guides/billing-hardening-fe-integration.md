# FE integration guide: billing hardening (August 2026, second round)

Covers the payment-infrastructure review shipped 2026-08-15. See `billing-fe-guide.md` for the
consolidated billing reference and `docs/billing-hardening-2026-08.md` for the earlier round — this
doc only covers what changed now.

Most of the eleven findings were fixed behind the API and need nothing from you: uploads that fail
halfway now delete the bytes they wrote, a nightly sweep reclaims objects no row references, a
refund now stops the subscription it paid for, and a plan change now actually reaches the payment
provider. **Four changes are visible to a client**, and they are the whole of this document:

1. a new error code on the renewal checkout (`5043`),
2. `5020 SUBSCRIPTION_ALREADY_ACTIVE` now fires in fewer cases, and means something narrower,
3. plan discounts are now charged, not just advertised,
4. `coversUntil` is capped at two years, so it can be earlier than an event's `endAt` implies.

---

## 1. `5043 EVENT_PURGED_NOT_RENEWABLE` — new

**Where:** `POST /api/events/{eventId}/subscription-checkout`
**HTTP:** `409`

A `PURGED` event's media has been destroyed and cannot be restored. The subscription that endpoint
opens preserves media, so on a purged event it charges monthly for nothing — the server now refuses
instead of taking the sale.

| status   | renewal checkout                               |
| -------- | ---------------------------------------------- |
| `DRAFT`  | ❌ `5014 EVENT_NOT_ACTIVE` — activate first    |
| `ACTIVE` | ✅                                             |
| `FROZEN` | ✅ — this is the case the endpoint exists for  |
| `PURGED` | ❌ `5043 EVENT_PURGED_NOT_RENEWABLE` — **new** |

**What to do:** hide (or disable) the "Keep this event online" CTA when `event.status === "PURGED"`,
and treat `5043` as terminal — no retry, no "try again shortly". The copy should be honest that the
media is gone; the only forward path is a new event.

Do not confuse this with `FROZEN`, which looks similar to a host and is exactly the state the
renewal is meant to rescue. Freezing hides media; purging destroys it.

---

## 2. `5020 SUBSCRIPTION_ALREADY_ACTIVE` now means "still collecting"

**Where:** `POST /api/events/{eventId}/subscription-checkout`
**HTTP:** `409` (unchanged)

Previously _any_ non-cancelled subscription row blocked a second one. That stranded hosts: a
`PAST_DUE` subscription — the card failed, nothing is being collected — is still "live" by that
rule, so the event lapsed toward freezing while every attempt to pay was answered with _"you already
have a subscription."_ There was no route out of it from inside the product.

The gate now asks whether the subscription is still **collecting money**:

| existing subscription                                | renewal checkout   | why                                                 |
| ---------------------------------------------------- | ------------------ | --------------------------------------------------- |
| `ACTIVE`, `currentPeriodEnd` in the future           | ❌ `5020`          | the month is bought and paid for                    |
| `ACTIVE` + `cancelAtPeriodEnd`, period still running | ❌ `5020`          | same — those days are already paid for              |
| `PAST_DUE`                                           | ✅ **now allowed** | old one is closed automatically, new checkout opens |
| `ACTIVE` with a missing/expired `currentPeriodEnd`   | ✅ **now allowed** | a lost `deleted` webhook; it collects nothing       |
| none                                                 | ✅                 | —                                                   |

Two things follow for the client:

- **Do not pre-gate the button on "a subscription row exists."** Gate on whether it is collecting:
  `status === "ACTIVE" && currentPeriodEnd > now`. Otherwise the FE re-implements the old, broken
  rule and the host still cannot pay.
- **The `5020` message is now specific and worth surfacing.** When the subscription is set to stop
  it reads:

    > Event `<id>` already has a live subscription, which is set to stop on `<ISO timestamp>`.

    That date is the host's actual answer — they are covered until then and should come back after.
    Prefer rendering the server message (or your own copy built from `currentPeriodEnd` in
    `GET /api/events/{eventId}/billing`) over a generic "already subscribed".

There is also a rarer `5020` variant, when the old subscription could not be closed at the provider:

> The previous subscription for this event could not be closed just now. Please try again shortly.

This one **is** retryable — it is a provider hiccup, not a rule. If you branch on message text
anywhere, branch on "try again shortly"; better, offer a retry on `5020` whenever the event has no
future-dated `currentPeriodEnd`.

---

## 3. Discounts are now charged

`PlanTierResponseDto` has carried `discountPercent`, `discountLabel`, `discountStartsAt` and
`discountEndsAt` for a while, and checkout ignored them — the catalogue advertised a promotion and
the card was charged the list price. That is now fixed in the direction that is safe: **an in-window
discount is applied to what the host actually pays.**

Applies to all three purchases:

| purchase          | discounted amount                                                                   |
| ----------------- | ----------------------------------------------------------------------------------- |
| activation        | `priceAmountMinor` − discount, **then** add-ons are added at full price             |
| renewal (monthly) | `recurringPriceAmountMinor` − discount, then add-ons at full price                  |
| upgrade           | the **difference** between the tiers, discounted by the **target** plan's promotion |

Rules worth knowing before you write the pricing component:

- **The window is honoured.** A promotion whose `discountStartsAt` is in the future, or whose
  `discountEndsAt` has passed, is not applied. `discountEndsAt` is exclusive.
  A null bound means unbounded on that side.
- **Add-ons are never discounted.** A plan promotion is on the plan.
- **The order is stamped with what was charged**, so `EventOrderDto.amountMinor` is the discounted
  figure. Do not recompute it client-side to display "what you paid" — read it back.
- **Never send a price.** As before, no checkout endpoint accepts an amount; everything is
  recomputed server-side from the catalogue row.

**What to do:** wherever you show a plan price, apply the same in-window test and show the struck
list price plus `discountLabel`. Any screen still showing the list price during a live promotion is
now _lying in the other direction_ — the host is quoted more than the card will be charged, which is
a better bug than the reverse but still a support ticket. The upgrade screen is the one to check
first, since the discount there applies to a difference rather than to the sticker price.

---

## 4. `coversUntil` is capped at 24 months

An activation is priced once and covers the event plus the plan's `includedMonths`, measured from
`endAt`. Nothing stops a host dating an event ten years out, and that bought a decade of storage for
one payment.

Coverage granted by an activation is now:

```
coversUntil = min(endAt, now + 24 months) + includedMonths
```

For essentially every real event this changes nothing — the clamp is a ceiling, not a schedule, and
an event inside the horizon is still covered from its own `endAt`. It matters only for events dated
more than two years out, where **`paidThrough` will be earlier than `endAt` + `includedMonths`**.

**What to do:**

- Never compute coverage on the client from `endAt` + `includedMonths`. Read `paidThrough` from
  `GET /api/events/{eventId}/billing`. (This was already the rule; the clamp is the first case where
  breaking it is visibly wrong.)
- On the activation checkout screen for a far-future event, say what is being bought — "covered
  until `<paidThrough>`; keep it online after that with a monthly subscription" — rather than
  implying the event date is covered.

---

## 5. Nothing to do (listed so it is not rediscovered as a bug)

- **A refund now cancels the event's subscription.** After a refund the event returns to `DRAFT` and
  its subscription is ended immediately. `GET /billing` will show no live subscription; that is
  correct, not a lost row.
- **An upgrade now reliably reprices the live subscription.** The plan change reached the provider
  before but could silently fail to persist locally, so `subscription.planTier` could disagree with
  what was being billed. If your UI has a workaround for that mismatch, it can go.
- **Failed uploads no longer leave stored bytes**, and a nightly sweep reclaims objects no media row
  references. Storage usage may drop on existing events the first time it runs — expected.

---

## 6. Test checklist

- [ ] Renewal CTA hidden on a `PURGED` event; `5043` renders as terminal, with no retry.
- [ ] Renewal CTA enabled on a `PAST_DUE` subscription, and the checkout completes.
- [ ] `5020` on an in-period subscription shows the stop date, not a generic message.
- [ ] A plan with an active promotion shows the discounted price, and the settled order's
      `amountMinor` matches what was shown.
- [ ] A promotion dated in the future shows the list price.
- [ ] Add-on line items are not discounted.
- [ ] An event dated three years out shows `paidThrough`, not `endAt` + `includedMonths`.
