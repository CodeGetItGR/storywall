# FE changes: stopping a subscription

**Read this if you have already built against `billing-fe-guide.md` or
`billing-payments-fe-integration.md`.** Both have been updated in place, but they are long and most
of what they say is unchanged. This is only the delta.

One new endpoint, one new field, two new error codes. Everything else here is a behaviour change with
no API change — worth knowing, nothing to build.

---

## 0. The whole thing in one table

| # | what changed | your work |
|---|---|---|
| 1 | `SubscriptionSummary` gains `cancelAtPeriodEnd: boolean` | add the field; **it changes how you render an `ACTIVE` subscription** — §2 |
| 2 | `DELETE /api/events/{eventId}/subscription` exists | build the cancel button — §3 |
| 3 | `5026` (409) and `5027` (**502**) | two cases in your error handling; the 502 is not a generic server error — §4 |
| 4 | Deleting an event now cancels its subscription | delete any "cancel your subscription first" copy or pre-step — §5 |
| 5 | Monthly renewals now appear in `orders[]` | nothing, but the order history grows every month now — §5 |
| 6 | An order can stay `PENDING` in a new (rare) case | nothing, if your polling already has a give-up path — §5 |

---

## 1. What cancelling actually does

The host bought the current month. Cancelling is a decision **not to renew** — it does not refund and
does not take the month away.

So the subscription stays `ACTIVE`, keeps its `currentPeriodEnd`, and keeps the event covered until
that date. What moves is one boolean. When the date arrives, the provider ends it and the event
lapses into the normal dunning → freeze path you already handle.

There is **no resume**. Undoing a cancellation means a new `subscription-checkout`, which creates a
new subscription. Confirm before calling, and put the period-end date in the confirmation copy.

---

## 2. The type change

```ts
export interface SubscriptionSummary {
  id: string;
  status: 'ACTIVE' | 'PAST_DUE' | 'CANCELLED';
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;   // ← new. Always present, never null.
  cancelledAt: string | null;
}
```

Returned by `GET /api/events/{eventId}/billing` and by the new endpoint.

### `ACTIVE` no longer means "renewing"

This is the part that breaks existing UI silently. If you render on `status` alone, a cancelled
subscription still reads as healthy and the host is told it will renew when it will not.

| `status` | `cancelAtPeriodEnd` | what it means | what to show |
|---|---|---|---|
| `ACTIVE` | `false` | renewing normally | "Renews on {currentPeriodEnd}" |
| `ACTIVE` | `true` | **cancelled, paid month still running** | "Won't renew. Your event stays live until {currentPeriodEnd}, then becomes read-only." |
| `PAST_DUE` | `false` | last payment failed, provider is retrying | your existing dunning banner |
| `PAST_DUE` | `true` | cancelled while a payment was failing | treat as cancelled — the dunning is moot |

### `status: 'CANCELLED'` never arrives on this endpoint

`GET /billing` only returns a *live* subscription. Once the provider ends it at the period boundary,
`subscription` becomes **`null`**, not a row with `status: 'CANCELLED'`.

So do not poll for `CANCELLED` — you will wait forever. The sequence a host actually sees is:

```
{ status: 'ACTIVE', cancelAtPeriodEnd: false }   → they press cancel
{ status: 'ACTIVE', cancelAtPeriodEnd: true  }   → until currentPeriodEnd
null                                             → after it
```

`CANCELLED` stays in the union because the field is typed from the same enum server-side, but nothing
reachable from the host-facing API returns it. `cancelledAt` is likewise always `null` in practice
here — a row with a date in it is not live, so it is not returned.

---

## 3. The new endpoint

```http
DELETE /api/events/{eventId}/subscription
```

Host only. No request body. Returns the updated `SubscriptionSummary`.

```jsonc
// 200
{
  "id": "…",
  "status": "ACTIVE",
  "currentPeriodEnd": "2026-09-12T00:00:00Z",
  "cancelAtPeriodEnd": true,
  "cancelledAt": null
}
```

- **Idempotent.** Pressing it twice returns the same body and charges nothing. A host re-checking is
  not a second instruction, so you do not need to disable the button after success — though hiding it
  once `cancelAtPeriodEnd` is `true` is the better UI.
- **Rate limited to 10/hour** per user. Generous for a button pressed once; you will only hit it by
  looping.
- `403` means the caller is not a host. Co-hosts count as hosts, same as everywhere else.
- The response is the whole truth — you do not need to refetch `/billing` after it. Do refetch if the
  screen also shows coverage dates, which do not change here but are cheap to keep in sync.

---

## 4. Error codes

Standard `ProblemDetail` envelope with numeric `errorCode`, as everywhere else.

| code | HTTP | when | what to show |
|---|---|---|---|
| `5026` `SUBSCRIPTION_NOT_LIVE` | 409 | nothing live to cancel | stale tab — refetch `/billing`. It was probably already cancelled, or the period already ended. Not an error worth alarming anyone about. |
| `5027` `SUBSCRIPTION_CANCEL_FAILED` | **502** | the payment provider refused or could not be reached | "We couldn't stop it just now — please try again in a moment." |

### The 502 needs handling, not a generic error page

Your interceptor probably treats `5xx` as "something broke, show the generic apology". That is the
wrong answer here, and it is the one case in this change that can cost a host money.

**Nothing changed and the card is still being charged.** The server asks the provider first and only
records the cancellation once the provider agrees, precisely so this failure is visible rather than
silent. If you render it as a generic error, or worse as a success, the host walks away believing
they cancelled while the money keeps leaving.

So: keep the cancel button visible and enabled, say it did not work, invite a retry. Do **not** set
`cancelAtPeriodEnd` optimistically in local state — take it from the response body only.

---

## 5. Changes with no API change

Nothing to build for these. Listed so they do not surprise you.

**Deleting an event cancels its subscription.** Immediately, server-side, no separate call. If you
have a "cancel your subscription before deleting" warning or a two-step flow, delete it — it is now
wrong. Deletion also still succeeds if the provider is unreachable; a background sweep retries the
cancellation hourly.

**Monthly renewal charges now appear in `orders[]`.** Previously only the first month produced an
order and later months left no trace. Now each renewal writes a `PAID` order with
`kind: 'RENEWAL'`. No type change — you already handle that kind — but a long-running event's order
history now grows by one row a month, so if the billing page renders every order unpaginated, it will
get long. Worth a "show more" if you do not have one.

**An order can now stay `PENDING` where it used to settle.** The server now refuses to settle an
order when the amount actually collected disagrees with the price (wrong currency, a discount applied
outside the app, nothing collected on a priced order). Rare, and nothing in the normal flow produces
it — but the effect on you is that the post-checkout polling loop (`billing-fe-guide.md` §6 step 5)
never sees `PAID`. If your polling already gives up after a timeout and offers a support route, that
path now has one more way to be reached. If it polls forever, fix that.

**Rate limiting got stricter about `X-Forwarded-For`.** Server-side hardening; no client impact. Only
mentioned because if you have a test harness that sets that header to spread requests across buckets,
it no longer works.

---

## 6. Checklist

- [ ] Add `cancelAtPeriodEnd` to `SubscriptionSummary`.
- [ ] Split the `ACTIVE` rendering on it — the "won't renew, live until X" state is new.
- [ ] Stop treating `subscription: null` as "never subscribed"; after a completed cancellation it is
      also "was subscribed, it ended".
- [ ] Cancel button on the plan page, behind a confirm dialog naming `currentPeriodEnd`.
- [ ] Handle `5026` as a refetch, not an error.
- [ ] Handle `5027` **out of** the generic 5xx path — retryable, still billing.
- [ ] Remove any "cancel before deleting the event" copy or pre-step.
- [ ] Check the order history renders sensibly at 12+ rows.
