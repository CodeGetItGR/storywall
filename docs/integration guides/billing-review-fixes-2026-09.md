# Billing review fixes, September 2026

A review of payments, withdrawals and upgrades on 2026-09-30 found six serious issues and ten
medium ones. This document records what was fixed, why, and what was left open. The fixes are on
the branch `fix/billing-review-2026-09-30` (worktree `esm-billing-fixes`), one commit per finding.

New in this batch:
- **Migrations:** V124 `event_orders.upgrade_from_option_id` and V125 `event_orders.dispute_closed_at`.
- **Error code:** 5105 `ORDER_NOT_MANUAL`.

The branch was cut before staging's V123 and 5104, so it needs a rebase before it merges. Its
migrations sort after V123, so they need no renumbering.

## Serious

### 1. A held withdrawal left the event usable (ba65179d)

A whole-event withdrawal that was `HELD` for review changed nothing until an admin released it.
The event stayed live, so a host could withdraw before the event day and then use the event on
that day. The release then refunded the day anyway, because it had not passed when the host filed.

**Fix:** a held whole-event withdrawal soft-deletes the event when it is filed. Under Art. 12 the
contract ends at filing; only the refund waits for review. A held request is only ever released,
never turned down, so the event never comes back. `EventService#cancelDeletion` refuses the Undo
with 5071 while such a request is `HELD` or `PENDING`. The host's notice and receipt email say the
event closed.

### 2 and 4. An upgrade was applied to a duration it was not priced from (00a0354d)

An upgrade is priced as the gap between two durations. It was applied to whatever the event was
on when it settled. That differed from the source duration in three cases:
- another upgrade settled first;
- the host changed a draft's duration;
- a withdrawal reverted an upgrade beneath it.

In each case the host paid one gap and got another. A reverted upgrade also went back to the
event's current option instead of the one it was bought from.

**Fix:** V124 pins the source duration on the order (`upgrade_from_option_id`).
- `applyUpgrade` refuses an order whose source is no longer the event's duration, and refunds it
  in full as unapplied.
- `revertUpgrade` restores the recorded source.
- Checkout reuses an open upgrade order only for the same source.

### 3. A provider refund left the event live (2102ada1)

When the provider reversed an activation, through a refund in the dashboard or a lost chargeback,
the event stayed `ACTIVE`, paid for by nobody. Once the activation was `REFUNDED`, the host's
upgrades and packs could no longer be withdrawn, because the gate required a `PAID` activation.

**Fix:** a reversed activation soft-deletes the event (`closeReversedEvent`), and Undo is refused.
The other orders on the event stay withdrawable. The gate accepts an activation the provider
reversed, as distinct from one a withdrawal refunded.

### 5. Every dispute reversed its order (fbd88f2e)

Stripe's `charge.dispute.funds_withdrawn` fires when a dispute opens, and it was mapped to a
reversal. A dispute the platform then won still left the order `REFUNDED`, the plan downgraded
and the commission reversed.

**Fix:** only a lost `dispute.closed` reverses an order. `funds_withdrawn` is dropped. A dispute
closed any other way becomes `DISPUTE_CLOSED`, which stamps V125 `dispute_closed_at`. The 10-day
auto-release of a `HELD` withdrawal waits while any of its orders has an open dispute, so the
same money is never refunded twice.

### 6. Admin settle-by-hand worked on Stripe orders (4a744dd9)

`POST /api/admin/orders/{id}/settle` was a stand-in used before Stripe existed. It settled any
`PENDING` order, including one whose Stripe session was still payable. That order could then be
paid a second time.

**Fix:** it refuses any order whose provider is not `MANUAL`, with 409 5105 `ORDER_NOT_MANUAL`,
before any write. There will be no admin settlement in production. The FE guides say so.

## Medium

| # | Finding | Fix | Commit |
|---|---|---|---|
| 7 | Packs and upgrades bought on an admin-provisioned event (no activation order) could never be withdrawn: the gate found no activation | The gate accepts an `ACTIVE` event with `activatedStartAt` and no activation order. `revertUpgrade` and `planUnder` fall back to the upgrade's recorded source (V124) | b438c421 |
| 8 | An order that bought nothing, such as a pack paid after its event was deleted or a second activation, stayed `PAID`. A later withdrawal priced it as delivered, and a pack's reversal took back bytes it never granted | `refundUnapplied` covers every kind: refunded in full at settlement | 20e96dc7 |
| 9 | One failing step of the billing sweep stopped every later step, including the purge | Each step is isolated, logged and counts as 0. The media purge isolates per event | 234b8c10 |
| 10 | Undo on a deleted event restored it even after its coverage ended, and the next sweep deleted it again | Refused with 409 5085 `COVERAGE_ENDED` | 234b8c10 |
| 12 | The confirmation token pinned the exact refund total, but the hosting refund drops by about a cent every 25–50 minutes. A confirm could fail with 5095 at random, and each retry spent the 5-per-hour limit on the withdrawal button | Token v2 carries the second the preview was computed, and filing recomputes at that second. v1 tokens are rejected with 5094 | 3ddaa8e8 |
| 13 | The Stripe refund runs inside the DB transaction. After a rollback, a retry past Stripe's 24-hour idempotency window could refund twice | Each refund carries `metadata.refund_key`. Before creating a refund, the payment intent's refunds are listed, and a live one with the same key counts as done | 50fce4e6 |
| 14 | A checkout the old primary host opened could be paid after a primary-host transfer, and only the new host could then withdraw it | The transfer closes every open checkout on the event first. It answers 5031 if a session may be being paid | f664a88d |
| 15 | `upgrade-options` priced fresh, but checkout reuses an open order at its pinned price, so the list and the payment page disagreed during a promotion | An open upgrade checkout's duration is listed at its pinned price (`CheckoutService#upgradeQuote`) | e414b857 |
| 11 | The 60% event-day share was kept on purchases made after the event: an upgrade bought after `startAt`, and a draft activated with a `startAt` already past | Checkout refuses a past-dated activation with 400 3035 `EVENT_START_PASSED`. An upgrade priced after the event has no event-day item: it keeps its setup share (5%), and the rest is coverage, refunded by time. One opened before the event and paid after it keeps only its stamped setup share; its event-day share is refunded by time with the coverage | cc351015 |
| 16 | A partial withdrawal reversed the partner's whole commission, although the platform kept 65% or more | The commission goes back in the share the host got back (the line's refund ratio), as a `CLAWBACK` row; the accrual stands. A full refund, a provider refund or a lost chargeback still reverses all of it | cc351015 |

### #11: why upgrades are withdrawable at all

A question from the user (2026-09-30): games and apps sell non-refundable micro-transactions, so
why must an upgrade be withdrawable? The EU exception they rely on, Art. 16(m) of Directive
2011/83/EU, covers *digital content* supplied at once, with the buyer's consent and
acknowledgement. An upgrade here buys ongoing hosting, which is a *service*, and for services the
consent to start immediately only makes the buyer pay for what was supplied (Art. 14(3)). The
right ends only once the service is fully performed (Art. 16(a)). Whether a narrower product could
count as digital content is a question for counsel; this change doesn't depend on it. Business
buyers have no right of withdrawal either way (V102).

An upgrade bought after the event keeps its setup share (5%), as every upgrade does: it is priced
and disclosed separately (C-641/19). The user chose this over refunding it by time alone.

## Config and doc drift fixed

- `app.billing.sweep.enabled`, `dunning-days` and `purge-grace-days` were read by nothing and are
  removed. The billing sweep runs whenever `NOTIFICATIONS_SWEEP_ENABLED` is on.
  `deployment-checklist.md` §5 is rewritten.
- `billing-fe-guide.md`:
  - the withdrawal body requires `confirmationToken`;
  - 5094 and 5095 are in the error table;
  - §1 no longer says events live indefinitely;
  - the `REFUNDED` note is corrected;
  - a held withdrawal closes the event.
- `event-money-and-dates-tldr.md`: hosted Checkout, not Embedded; extensions also move `coverageEndsAt`.

## Known residuals

- The `OPEN_DISPUTE` fraud signal still counts disputes that closed.
- An admin release is not blocked by an open dispute; only the auto-release is.
- An unapplied order stays `PAID` if its provider refund fails. It is logged at ERROR for a manual
  refund.
- The 09-17 withdrawal spec is still marked draft, with no superseded banner. The coverage spec
  §6.3 says a reversal takes back the order's pinned months; the code uses the gap between the
  two durations. Neither doc is edited here.
