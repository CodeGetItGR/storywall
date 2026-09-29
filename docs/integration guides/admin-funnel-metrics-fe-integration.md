# FE integration guide: admin conversion funnel

Shipped 2026-09-29. Two new admin endpoints give the account conversion funnel: how many signups
verify, create an event, pay, and actually use the event. Also where people stall, how active
accounts are, and what came in. Everything is **counts only**: no endpoint returns an id, a name or
an address. Types are in `docs/frontend-api-types.ts` (`FunnelMetricsResponseDto`,
`FunnelCohortDto`). Base setup (auth header, RFC 7807 errors) is in `frontend-integration-guide.md`
§0.

Before this, `GET /api/admin/metrics` gave platform totals only (users, events by status and plan,
storage, newsletter). Those totals included admins and invite-minted guest users, and nothing
connected a signup to a payment. That endpoint is unchanged.

## Endpoints

| Method | Path | Params | Returns |
|---|---|---|---|
| GET | `/api/admin/metrics/funnel` | `since`, `until`: optional ISO-8601, `until` exclusive | `FunnelMetricsResponseDto` |
| GET | `/api/admin/metrics/funnel/cohorts` | `weeks`: default 12, clamped to 1..104 | `FunnelCohortDto[]` |

Both require `ADMIN` (403 otherwise). `until` before `since` → 400. Omit both bounds for all time.

## The two windows

Read this before putting a date picker on the page, because the same range means two different
things:

| Sections | The range filters… | Reads as |
|---|---|---|
| `funnel`, `stuck`, `activity`, `timeToConvert`, `guestToHost`, `accounts` | accounts by **signup date**, then follows them to today | "Of March's signups, how many have paid by now?" |
| `paidEvents`, `revenue` | orders by **payment date**, refunds by **decision date** | "What came in during March?" |

So `funnel.paidHost` for March can grow next month as March's signups pay, while `revenue` for
March is final once March is over. Label the two groups separately in the UI.

## Who counts as an account

A registered user with `platform_role = USER` that is not a guest account. **Admins are excluded**,
and with them every demo event (admins host those). This is why `funnel.signedUp` is lower than
`/api/admin/metrics`'s `totalUsers`.

## Definitions

| Field | Means |
|---|---|
| `emailVerified` | Clicked the confirmation link, or signed up through an OAuth provider that vouched for the address. |
| `createdEvent` | Primary host (host #1) of at least one event: a draft or a deleted one counts, since creating it was the conversion. Events purged after their retention period lose their host link and drop out. |
| **`paidHost`** | **The headline.** Paid through the payment provider for at least one event activation, amount above zero, not fully refunded. Orders survive an event purge, so a purge doesn't undo the conversion. |
| `repeatPaidHost` | Paid for two or more events. |
| `engagedHost` | Hosts an event with **at least one guest and at least one upload**, meaning the event was actually used. The secondary "real host" measure, shown beside `paidHost`. It is not a subset of it, because an admin-settled event can qualify. |
| `adminSettledHost` | Went live only through an admin settlement or a €0 order. The system records a bank-transfer settlement and a comp the same way, so this can't tell them apart. Kept out of `paidHost` on purpose. |

`stuck` counts ACTIVE accounts only. `abandonedCheckout` (opened an activation checkout and never
went live) is a subset of `eventNeverPaid`. `paidNotEngaged` covers paid hosts none of whose events
has both a guest and an upload yet. For an event that hasn't happened, that is normal.

`activity` comes from the new `users.last_active_at`, stamped when an account signs in or refreshes
its access token, at most once a day. **Tracking began with this release.** Every account that
hasn't signed in since then is in `neverRecorded`, not `inactiveOver30Days`. Expect
`neverRecorded` to shrink over the first few weeks, and don't read it as churn.

`timeToConvert` values are medians in hours over the accounts that reached each step, and null
when none did. `medianHoursFirstEventToPaid` can be negative for accounts an admin provisioned with
an event.

`guestToHost` counts accounts that joined someone else's event as a guest **before** hosting their
own (`attendedFirst`), and how many of those went on to host or pay. It only sees guests whose
membership is linked to their account. A guest who joined anonymously and later registered without
claiming that membership looks like any other signup, so treat these numbers as a floor.

`paidEvents.ended*` only counts events whose `endAt` has passed, because an upcoming event has no
uploads yet. `endedWithoutUploads` is the "paid but never used" warning sign.

`revenue.totals[].grossMinor` includes orders later refunded. `refundedMinor` is the money
actually returned by refunds decided in the range, partial refunds included, so `netMinor` =
gross − refunded. It is grouped by currency and never summed across currencies. `adminSettledOrders`
is a count only, since it isn't provider-confirmed money. `discountRedemptions` counts house codes
and `partnerRedemptions` partner codes.

## Cohorts

`/funnel/cohorts` returns one row per signup week (Monday 00:00 UTC), oldest first, ending with
the current week. Empty weeks are zero rows, so a chart axis never has gaps. Each row uses the
`funnel` definitions above. Recent weeks always look worse than older ones because they've had
less time to convert, so compare a week against weeks of the same age.

## Weekly digest

The Monday metrics email (`app.metrics.digest.*`) now also carries: new accounts and net revenue
over the last 7 days, all-time paid hosts as "N of M accounts (x%)", and accounts active in the
last 7 days.

## Known gaps

- **No signup source.** Signups aren't tagged with where they came from (ads, referral,
  organic), so conversion by channel isn't possible yet.
- **Activity starts at zero.** See `activity` above.
- **Purged events** drop out of `createdEvent` and `engagedHost`, but not out of `paidHost` or
  revenue.
