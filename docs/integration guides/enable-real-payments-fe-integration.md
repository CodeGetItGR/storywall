# FE integration guide: remove the "payments aren't enabled" step

Directive doc, not a change to the API. Nothing on the backend moved — this exists because the FE
has a stopgap screen that needs to come out, and to say plainly what must replace it. If your build
already follows §6 of `billing-fe-guide.md` end to end, this doc asks for nothing new; treat it as
confirmation.

**Assumption stated up front, since the request that prompted this doc was verbal, not a ticket:**
"the event shouldn't be allowed to be created unless the amount has been paid in full" is read here
as _the event must not be treated as usable, or handed to the host as done, before its activation
order is `PAID`_ — not as a change to `POST /api/events` itself. That endpoint has always returned a
`DRAFT` before any money moves, and that is intentional (§6 step 1 of `billing-fe-guide.md`): a draft
is the host's private scratch space to fill in details before paying, invisible to everyone else,
unable to invite guests. If "created" in your build currently means something more than that draft —
if the plan-verification step is followed by anything that looks finished to the host — that is the
gap this doc is about.

---

## 1. What's being removed

An intermediate screen exists today that tells the host payments are not currently enabled. By
description, its only real function is validating the chosen plan — it does not open a checkout, does
not collect a card, and does not wait for a payment to settle. Whatever happens after it (the event
being shown as created, published, or ready) is happening **without a paid `ACTIVATION` order**.

That screen, and that path, need to go. There is no partial or "soft launch" version of this: an event
must not become visible or usable to anyone off the back of plan selection alone.

## 2. What replaces it

The real flow, already fully specified in `billing-fe-guide.md` §6 ("Activation: the first purchase").
Build against that section as the source of truth; this doc only calls out the parts that matter most
given what's being removed.

```
1. POST /api/events                      → 201, status: "DRAFT"
2. host fills in details, incl. endAt    → PATCH /api/events/{id}
3. POST /api/events/{id}/checkout        → 200 { orderId, redirectUrl }
4. window.location.href = redirectUrl    → the provider's hosted page
5. provider redirects back to
   /events/{id}/checkout/success|cancelled
6. poll GET /api/events/{id}/billing until the order is PAID
```

The plan-verification step your FE has today is fine to keep **as step 2** — picking and confirming a
plan before paying is normal. What it cannot do is stand in for steps 3–6, or lead anywhere that
implies the event is ready.

## 3. Behave as if payments are enabled via the webhook — what that means concretely

"Behave as if payments are enabled via the webhook" means: build and test the FE exactly as it would
run against the real `STRIPE` provider, where settlement is asynchronous and arrives on
`checkout.session.completed`, not against the shortcuts the `MANUAL` provider affords.

This project ships with `app.billing.provider=MANUAL` by default (see `application.properties`) — the
provider that takes no money and sends no webhooks, meant for local/backend-only testing
(`ManualPaymentProvider`, `POST /api/admin/orders/{orderId}/settle`). It is easy to build a FE against
`MANUAL` that quietly assumes settlement is synchronous — the redirect back from checkout _feels_ like
completion when there's no real webhook race to expose the gap. That assumption breaks the moment
`STRIPE` is live, where the webhook can land seconds after the redirect, or fail to land at all and
get picked up by the reconciliation sweep ~15 minutes later instead.

So, concretely:

- **Landing on `/checkout/success` is not "paid."** It means the host finished the provider's hosted
  page. Do not show the event as created, active, or shareable at that point.
- **Poll `GET /api/events/{eventId}/billing` and watch the specific order id** you got back from step
  3, waiting for `status === "PAID"` — exactly the snippet in §6 step 5 of `billing-fe-guide.md`. Do
  not poll or gate on `event.status` alone; a renewal or upgrade settling never changes it, and for
  activation specifically, `status` only flips once the webhook (or the sweep, or an admin settle) has
  actually run.
- **A timeout is not a failure.** If the poll times out, the correct state is "still processing," with
  a way back to the event — never "payment failed." The reconciliation sweep will settle a lost
  webhook within roughly `app.billing.reconcile-after-minutes` (15 by default).
- **`/checkout/cancelled` leaves the event a `DRAFT`, unpaid.** Offer the checkout button again;
  nothing needs to be cleaned up or rolled back.
- Test locally with `stripe listen --forward-to <host>/api/webhooks/stripe` (or point
  `BILLING_PROVIDER` at `STRIPE` in a shared dev/staging environment) rather than only against
  `MANUAL` — the manual provider cannot exercise the wait state at all, since nothing ever calls back
  asynchronously.

## 4. The invariant to hold everywhere

**An event is not created, in the sense of "exists for anyone but its host to see," until its
`ACTIVATION` order is `PAID`.** This is already how the backend behaves — `DRAFT` events are excluded
from every listing but the host's own, guests cannot be invited to one, and no module reports
available (`billing-fe-guide.md` §5). The FE's job is to stop implying otherwise anywhere in the plan
→ pay journey:

- No success/confirmation screen, share link, invite flow, or "your event" redirect before the order
  polls `PAID`.
- No route that lets a host reach guest-invite, publishing, or module setup screens from a `DRAFT`
  event that hasn't paid — those all already 409 server-side (`5014 EVENT_NOT_ACTIVE`,
  `EventStatus.DRAFT` gating in `billing-fe-guide.md` §5), but the UI should not offer the button in
  the first place.
- The only screens a `DRAFT` event should lead to are: finish details → pay. Nothing past checkout is
  reachable without a `PAID` order, full stop.

## 5. Test checklist

- [ ] The "payments aren't enabled" screen (and the "verify plan only" path behind it) is gone from
      the build.
- [ ] Plan selection leads to a real `POST /api/events/{id}/checkout` call, a redirect to the
      provider's hosted page, and the two return routes from §6 step 4.
- [ ] `/checkout/success` shows a waiting state and polls the specific order id, not just
      `event.status`.
- [ ] A simulated slow/lost webhook (delay or skip the local `stripe listen` forward) does not produce
      a "payment failed" message — it shows "still processing."
- [ ] `/checkout/cancelled` returns the host to a re-payable `DRAFT` with no side effects.
- [ ] No screen reachable before the order is `PAID` implies the event is live, shareable, or ready
      for guests.
