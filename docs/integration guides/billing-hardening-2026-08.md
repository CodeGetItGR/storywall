# Billing hardening — August 2026

A payment-flow review turned up sixteen findings; this documents what each one was and what was
done about it. Everything here is backend, with one migration (`V29__billing_hardening.sql`) and a
handful of API-visible additions collected in §6 for the frontend.

The short version: three of these let an event stay live on money that had gone back, three of them
lost or double-charged real payments, and the rest were the accounting around them.

---

## 1. Critical

### C1 — a reversed order made the event permanently free

Coverage is `max()` over the coverage windows of PAID orders, and an event with **no** such row at
all reads as _grandfathered_ — unmetered, never frozen, never purged. That default exists for events
that predate billing, and it was catastrophic for one whose only payment was reversed: refunding an
order cleared its window and dropped it out of the PAID set, so the event stopped being metered
entirely. Charge back after the wedding and the event stayed live forever, with the host-facing
billing screen agreeing.

**Fixed** by making a reversal a coverage term of its own. `event_orders.refunded_at` is stamped when
an order is reversed, and `EventCoverageService` emits it exactly as it emits a `covers_until`:

```
paidThrough = max( latest covers_until over PAID orders,
                   latest refunded_at  over REFUNDED orders,
                   live subscription currentPeriodEnd )
```

Because it composes through the existing `max()`, no case needed special-casing:

| situation                                                  | before        | after                                                        |
| ---------------------------------------------------------- | ------------- | ------------------------------------------------------------ |
| live PAID order to 2027, an unrelated order reversed today | 2027          | 2027                                                         |
| only order reversed today                                  | grandfathered | metered from today, lapses through the normal dunning window |
| no orders at all (pre-billing event)                       | grandfathered | grandfathered                                                |

A CHECK constraint (`status <> 'REFUNDED' OR refunded_at IS NOT NULL`) keeps the old failure from
returning silently one missed assignment later.

### C2 — cancelling an order left the provider's session payable

`CheckoutService` replaces an open order when the plan, the provider, or the session's lifetime has
changed under it. It marked the row `CANCELLED` and did nothing at the provider — but the order row
is ours and the hosted session is not. The page the host still had open stayed payable, and paying
it produced a charged customer, a draft event, and a failed webhook delivery as the only trace,
because settlement only accepts a PENDING order.

**Fixed** with `PaymentProvider.expireCheckout(sessionId)`, called before the row is written off.
The Stripe implementation retrieves the session and switches on its status, because "already
expired" and "already complete" mean opposite things:

| status                           | answer                                      |
| -------------------------------- | ------------------------------------------- |
| `expired`, or `resource_missing` | true — already unpayable                    |
| `open`                           | expire it, then true                        |
| `complete`                       | **false** — a payment is already on its way |
| any other `StripeException`      | false, logged as an error                   |

When the answer is false the checkout is refused with `CHECKOUT_SESSION_UNRESOLVED` (5031) rather
than forced. Neither remaining option is safe: cancelling races a settlement in flight, and reusing
the order would charge for a different plan or provider than the host asked for. The refusal is
correct in the case that actually produces it — a moment later the host has what they were buying.

### C3 — refunds under-paid by the tax

`refund(providerPaymentId, amountMinor)` sent the order's stored net amount. With Stripe automatic
tax and `EXCLUSIVE` behaviour, the customer paid net **plus** tax, so every refund was short by the
tax — and Stripe reported `charge.refunded` with `refunded: false`, which this platform's own
partial-refund guard then filtered out as a goodwill partial. The reversal never happened at all.

**Fixed** by deleting the amount: `refund(providerPaymentId)` sends no `amount`, which refunds the
whole charge including tax. That matches the method's own contract, and it makes the
`refund-<paymentIntent>` idempotency key sound.

---

## 2. High

### H1 — concurrent checkouts created two payable sessions

The "reuse the open order rather than open a second one" logic was an unlocked check-then-act. Two
requests arriving together both found nothing to reuse and both wrote an order — two live sessions,
both payable, and since coverage is a `max()` the second payment buys the host nothing. Worse for
RENEWAL: two settlements then race the one-live-subscription index, and the loser's webhook dies on
a constraint violation, leaving a provider-side subscription billing monthly that no row here names
and no cancellation path can reach.

**Fixed** at two levels. The service takes a `PESSIMISTIC_WRITE` lock on the event's open orders of
that kind before reading them, so the second caller waits and then finds the first caller's order.
Behind it, a partial unique index — `ux_event_orders_one_open_per_kind` on `(event_id, kind) WHERE
status = 'PENDING'` — makes the second insert impossible if a path is ever added that forgets the
lock. The migration cancels any duplicates already in flight, keeping the newest.

### H2 — a failed non-checkout delivery was lost forever

The webhook endpoint answers 200 whatever a handler does, on purpose: a deterministic failure
retried forever helps nobody and burns the provider's retry budget for the deliveries that would
have worked. The price of that is that the provider stops trying and this platform is the last party
holding the delivery — and the ledger recorded only that _something_ arrived, not what it said.
Reconciliation re-derives a checkout outcome by asking the provider about the session. Nothing
re-derives a refund, a lost dispute, or a subscription change.

**Fixed** by keeping the verified body. `provider_webhook_events` gained `payload` and `signature`,
written with the claim and **cleared the moment the delivery is processed** — enforced by a CHECK,
so a successful delivery never leaves customer detail (billing address, email) sitting in the
ledger, and the table does not grow without bound.

`WebhookReplayService` runs a stored delivery again. The stored body is **re-verified against the
provider's signature check** before anything acts on it: the ledger is an ordinary application table
that an operator, a migration, or a compromised account could write to, and nothing about having
stored a body makes it authoritative. A row whose signature no longer verifies is refused loudly —
it means either the payload was altered in storage or the webhook secret was rotated, and both
deserve a human.

The routing switch moved out of the controller into `WebhookDispatcher` so the live endpoint and the
replay path share one implementation and cannot drift.

### H3 — chargebacks did nothing on a default deployment

`app.billing.sweep.enabled` shipped `false`, so on a default configuration a lapsed or charged-back
event was never frozen. The documented reason for shipping it off was that _purging_ is
irreversible — but freezing is not, `revive` exists, and a payment undoes it automatically.

**Fixed** by splitting the switch rather than flipping it:

| property                          | default    | what it gates                             |
| --------------------------------- | ---------- | ----------------------------------------- |
| `app.billing.sweep.enabled`       | **`true`** | freeze / revive — reversible              |
| `app.billing.sweep.purge-enabled` | `false`    | purge — destroys media, undone by nothing |

---

## 3. Medium

**M1 — renewal orders that could never be reversed.** `settleRenewal` keyed everything on
`invoice.payment_intent`, which moved off the invoice in Stripe's `2025-09-30.clover`. An account
pinned past that reported null for every renewal, month after month, with nothing in the payload
marked wrong — and a renewal order with no payment id can never be refunded, disputed, or recognised
as a redelivery. Now falls back to `invoice.charge` (the same money under an older name), and
refuses to write the order at all when neither is present, logging an error instead of a silent
half-record.

**M2 — discounted settlements passed the amount check.** Stripe subtracts a coupon between
`amount_subtotal` and `amount_total`, so a 90%-off session reported the same subtotal as a
full-price one and settlement passed it as fully paid. Coupons are one dashboard click away, on an
account where nothing in this codebase would have to change for it to start happening. `ProviderEvent.netAmountMinor` is now defined as `amount_subtotal - total_details.amount_discount`,
which makes the existing equality check mean "did the money arrive" rather than "was the right price
displayed" — no new field, no new branch. A discount is logged when present.

**M3 — reconciliation was unbounded, and settled deleted events.** It fetched _every_ PENDING order
ever, each costing a provider round-trip, in one untransacted loop. Now paged at
`app.billing.reconcile-batch-size` (200), oldest first. Separately, `markOrderPaid` now refuses an
event with `deletedAt` set — reconciliation could otherwise settle a stale activation for an event
the host had since deleted and set it ACTIVE, where the lifecycle queries would never see it again.

**M4 — upgrades were invisible to the refund path.** A host who activated, upgraded, then had the
activation refunded went back to DRAFT with the upgrade money kept and the event still on the
upgraded tier. `RefundService.approve` now reverses the event's settled UPGRADE orders **before** the
activation — that order matters, because `revertUpgrade` derives the tier to restore from the orders
that remain and the activation is the one that names it. Reversing an upgrade puts the event back on
the newest remaining paid tier and repositions the subscription price with it; it no-ops if the event
has since moved off the order's tier by another route.

**M5 — upgrades were sold on FROZEN and PURGED events.** A host could be sold a higher storage
ceiling on a read-only event, or on one whose media was already destroyed, and the subscription would
be repriced _upward_ on a purged event. `startUpgrade` now rejects both with `EVENT_FROZEN`.

**M6 — ordinary races became stuck ledger rows.** A `checkout.session.expired` arriving after an
async success, or after the order was cancelled, threw — producing an unprocessed row
indistinguishable from a genuinely lost settlement, which dilutes the one signal operators have.
`requirePending` became `requireSettleable`: PENDING passes, FAILED passes with a warning (the
payment recovered), and CANCELLED/REFUNDED still throw. `markOrderFailed` logs and returns for a
non-PENDING order rather than throwing.

**M7 — a leaked Stripe Product per upgrade.** `swapSubscriptionPrice` created a new product on every
call, with no idempotency, inside the settlement transaction. It now uses a deterministic id
(`plan-preservation-<plancode>`) with retrieve-then-create, tolerating both `resource_missing` and
`resource_already_exists`.

---

## 4. Lower

**Audit trail for manual settlement.** `POST /api/admin/orders/{id}/settle` is the one route that
makes an event live without money, and it wrote nothing but a log line. `event_orders.settled_by`
now records the admin (`ON DELETE SET NULL`, so removing an admin account neither blocks nor
destroys order history). A missing user is logged and left null rather than thrown: this runs inside
the settlement transaction, and throwing would roll back a settlement that already succeeded —
trading a payment for an audit row, which is the wrong way round.

**Webhook body size cap.** The endpoint is unauthenticated and signature verification runs over the
whole body, so without a ceiling an anonymous caller chose how much work each request cost. Bodies
over 256 KiB are now rejected with `WEBHOOK_PAYLOAD_TOO_LARGE` (3011), checked _before_ verification.
The rate limit bounds how many requests arrive; this bounds how expensive one can be.

**Quota is advisory once money is in flight — unchanged, and deliberate.** The active-event cap is
checked when checkout opens and never at settlement, so a host at their cap can open several
activation checkouts and pay them all. Re-checking at settlement would reject a payment already
taken: the quota rejection rolls back the settlement transaction with it, the order stays PENDING,
its ledger row is already claimed so the redelivery is dropped as a duplicate, and reconciliation
hits the same rejection forever. The host has paid, so the cap yields. Recorded here because it is
a decision, not an oversight.

---

## 5. Migration — `V29__billing_hardening.sql`

| change                                                                            | why   |
| --------------------------------------------------------------------------------- | ----- |
| `event_orders.refunded_at` + backfill from `updated_at` + CHECK + partial index   | C1    |
| `event_orders.settled_by` → `users(id) ON DELETE SET NULL`                        | audit |
| dedupe open orders, then `ux_event_orders_one_open_per_kind`                      | H1    |
| `provider_webhook_events.payload` + `.signature` + CHECK (cleared once processed) | H2    |

The backfill sets `refunded_at = updated_at` for existing REFUNDED rows: nothing else writes to a
reversed order, so its last write _is_ the reversal.

> The main test suite runs H2 with Flyway disabled, so none of this DDL executes there.
> `BillingMigrationTest` (testcontainers Postgres, skips itself without Docker) is the only place the
> CHECKs and partial indexes are exercised.

---

## 6. What the frontend sees

**New error codes**

| code | name                          | when                                                                                                                                                                 |
| ---- | ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 3011 | `WEBHOOK_PAYLOAD_TOO_LARGE`   | provider-facing only; never reaches an app client                                                                                                                    |
| 5031 | `CHECKOUT_SESSION_UNRESOLVED` | opening a checkout while a previous session may still be settling. **Retryable** — show "still finishing your last payment, try again in a moment", not a hard error |
| 5032 | `WEBHOOK_ALREADY_PROCESSED`   | admin replay of a delivery that already succeeded                                                                                                                    |
| 5033 | `WEBHOOK_NOT_REPLAYABLE`      | admin replay of a delivery recorded before bodies were kept                                                                                                          |

Also newly reachable: `startUpgrade` now returns **`EVENT_FROZEN`** for a FROZEN or PURGED event.
The upgrade CTA should be hidden in those states rather than relying on the error.

**New admin endpoint**

```
POST /api/admin/webhooks/{provider}/{providerEventId}/replay
```

Rate-limited at 30/min under `admin.money`, alongside the other money-moving routes. Returns 200 with
an empty body on success; 5032 / 5033 as above; 404 if the delivery is unknown; 400 if the stored
body no longer verifies. It grants an admin the ability to retry what the provider sent, never the
ability to author a settlement.

**Changed DTO** — `UnprocessedWebhookDto` gained `replayable: boolean`. The unprocessed-webhooks
admin list should only offer the replay action where it is true.

---

## 7. Tests

New coverage, all in `src/test/java/event_social_media/`:

| file                                                   | covers                                                                                                     |
| ------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------- |
| `service/billing/CheckoutSessionExpiryTest`            | C2 — both answers from `expireCheckout`, including the refusal leaving the order PENDING                   |
| `service/billing/WebhookReplayTest`                    | H2 — replay, re-verification of the stored body, already-processed and body-less refusals                  |
| `service/billing/OrderSettlementTest` (extended)       | C1 — a reversal keeps the event metered; a reversal must not shorten a window another order still pays for |
| `service/billing/StripePaymentProviderTest` (extended) | M2 — discount subtracted, tax not mistaken for one; M1 — charge fallback                                   |
| `migration/BillingMigrationTest` (extended)            | V29 — `refunded_at` CHECK, one-open-order index, processed-delivery-keeps-no-body CHECK                    |

`OrderSettlementTest.aRefundTakesBackTheCoverageItPaidFor` previously asserted the C1 bug as intended
behaviour — it asserted the event became unmetered after a refund. It now asserts the opposite.

Full suite: 561 tests, green.
