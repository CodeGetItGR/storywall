# FE integration guide: refunds, rate limiting, and the new billing notifications

> **Superseded — kept as change history.** Build against **`billing-fe-guide.md`**, which covers
> plans, quotas, modules, payments, subscriptions and refunds as one current reference. This file
> records what changed on 2026-08-07 and why, which the consolidated guide does not.

Covers the work shipped 2026-08-07, on top of the payment and plan-tier features. Read
`billing-payments-fe-integration.md` first — this is a delta, and it assumes the activation /
preservation model, the `DRAFT → ACTIVE → FROZEN → PURGED` lifecycle, and the RFC 7807 error
envelope described there. `frontend-integration-guide.md` §0 has the auth header and error shape.

Three things are new:

1. **A refund flow.** A host can ask for their activation payment back; an admin decides. Approval
   sends the money back _and takes the event down to `DRAFT`_.
2. **Rate limiting on every `/api` endpoint.** A new `429` you must handle globally.
3. **Two notification types** telling the host how their refund request was decided.

---

## 1. Refunds: the mental model

A refund is **requested**, not taken. There is no endpoint that moves money on a host's say-so.

```
host clicks "Request a refund"
        │
        ├─ server checks four gates ──► fails ──► 409 REFUND_NOT_ELIGIBLE, with reasons
        │
        ▼
   PENDING request  ──► admin reviews the queue
        │                        │
        │                        ├─ approve ──► money back + event → DRAFT + host notified
        │                        └─ reject  ──► nothing changes + host notified
        ▼
   host sees status in the event's billing page
```

### The four gates

An activation payment is refundable only while **all four** hold:

| gate                       | fails when                                                                        |
| -------------------------- | --------------------------------------------------------------------------------- |
| nobody but the host joined | any non-host member has ever existed on the event, _including ones since removed_ |
| no content exists          | any post or media has ever existed, _including soft-deleted ones_                 |
| the refund window is open  | more than `14` days (configurable) since the payment settled                      |
| the event has not started  | `startAt` is in the past                                                          |

The "including deleted" part is deliberate and worth surfacing in your copy if a host asks: the
bytes were stored and paid for whether or not they are still visible, so deleting a gallery does not
make an event refundable again.

Only the **activation** order is refundable. Renewals buy storage that has already been consumed.

### What approval does to the event

The event goes back to `DRAFT`. It disappears from guests, becomes unpublished, and needs a fresh
activation payment to come back. Your confirmation dialog must say this plainly — "your event will
be taken offline and returned to draft" — because it is not what "refund" implies on its own.

---

## 2. Host-facing endpoints

All three require the caller to be a host of the event (co-hosts count). `403` otherwise.

### `GET /api/events/{eventId}/refund-eligibility`

Call this when the billing page loads. It is what decides whether you render the button at all.

```jsonc
{
    "eligible": false,
    "reasons": ["3 people have already joined this event.", "Content has already been added to this event."],
    "hasPendingRequest": false,
}
```

- `reasons` are written to be shown to the host verbatim. They state facts about the host's own
  event that they can check themselves. Do not paraphrase them into "not eligible".
- **Every** failing reason is returned, not the first. A host who clears one obstacle and is then
  told about a second reads it as the platform inventing obstacles, so show the whole list at once.
- `hasPendingRequest` is separate from `eligible` on purpose: a host with a request in flight should
  see "we're looking at it", not the gates.

Advisory only — everything here is re-checked server-side when a request is actually made.

**Rendering:**

| state                     | show                                                                                                       |
| ------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `hasPendingRequest: true` | "Refund request under review" + the pending request's details                                              |
| `eligible: true`          | the "Request a refund" button                                                                              |
| `eligible: false`         | the button, disabled, with `reasons` as the explanation — hiding it entirely just prompts a support ticket |

### `POST /api/events/{eventId}/refund-requests`

```jsonc
// request
{ "reason": "I created this event by mistake and haven't used it." }
```

`reason` is **required**, non-blank, max 1000 characters. It is stored verbatim and is the first
thing the admin reads, so make the field a textarea with a real prompt, not an afterthought.

Returns the created request (shape in §4). Rate limited to **5 per hour per user**.

### `GET /api/events/{eventId}/refund-requests`

The event's request history, newest first. Use it for the "under review" panel and to show a past
rejection with the admin's note.

---

## 3. Admin-facing endpoints

All `ROLE_ADMIN`, under `/api/admin`.

### `GET /api/admin/refund-requests`

The queue, oldest first, **with the usage evidence behind each request**. This is the endpoint the
admin refund screen is built on.

```jsonc
[
    {
        "request": {/* RefundRequestResponse — see §4 */},

        "eventTitle": "Anna & Nik's Wedding",
        "eventStatus": "ACTIVE",
        "eventStartAt": "2026-09-12T16:00:00Z",
        "eventEndAt": "2026-09-13T02:00:00Z",
        "paidAt": "2026-08-05T09:14:22Z",

        "hostDisplayName": "Nikos P.",
        "hostEmail": "nikos@example.com",

        "currentlyEligible": true,
        "ineligibilityReasons": [],

        "guestCount": 0,
        "hostCount": 1,
        "postCount": 0,
        "mediaCount": 0,
        "storageBytes": 0,
    },
]
```

**Why these fields exist.** The server enforces the gates on approval regardless — but "the server
will stop you" is not the same as "you can tell whether to say yes". The gates are four crude
proxies for _did this host get what they paid for_, and the admin's actual job is the cases the
gates cannot see: an event created by mistake, a duplicate payment, the wrong tier bought. Deciding
that from a request id and a paragraph of free text means clicking approve and hoping.

So build the screen around the evidence, not the buttons:

- Put `guestCount` / `postCount` / `mediaCount` / `storageBytes` where they are read _before_ the
  approve button, not in a collapsed panel.
- The counts include soft-deleted rows, matching the gates exactly. A host who uploaded fifty photos
  and deleted them shows as `mediaCount: 50` — that is the point.
- `currentlyEligible: false` means **approving will be refused** with a `409`. Disable the approve
  button and show `ineligibilityReasons`. This happens when an event is used while its request sits
  in the queue.
- `hostEmail` is here because deciding a refund usually means contacting the host first. It is
  admin-only and never appears on the host-facing shape.
- Reject stays available even when `currentlyEligible` is false — that is exactly when it is used.

### `POST /api/admin/refund-requests/{requestId}/approve`

```jsonc
// body is optional
{ "note": "Duplicate payment — refunded the second charge." }
```

`note` is optional, max 1000 characters, and **is shown to the host** in their notification. Write
the UI hint accordingly ("this note is sent to the host").

Approving, in order: asks the provider to reverse the charge → reverses the order so it stops
counting as coverage → returns the event to `DRAFT` → notifies the host.

Watch `providerRefunded` in the response. **`false` on an approved request means no money actually
moved** and somebody has to return it by hand — the manual provider has no charge to reverse, and a
provider call can fail. Surface it as a warning row in the decided list, not as a silent field.

### `POST /api/admin/refund-requests/{requestId}/reject`

Same body. Nothing about the order or the event changes; the note is the entire outcome, and it is
what the host is owed by way of an answer. Treat it as effectively required in your UI even though
the server allows it to be null.

Both decision endpoints are rate limited to **30 per minute per admin**, shared with
`POST /orders/{orderId}/settle`.

---

## 4. `RefundRequestResponse`

The same shape for both the host and the admin — there is nothing in it a host may not read. The
provider's payment id is not included, for the same reason order summaries omit it.

```ts
type RefundRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

interface RefundRequestResponse {
    id: string;
    eventId: string;
    orderId: string;
    status: RefundRequestStatus;
    reason: string; // the host's own words
    amountMinor: number | null; // minor units, e.g. 4900 = €49.00
    currency: string | null;
    requestedById: string;
    requestedAt: string; // ISO-8601
    decidedById: string | null;
    decidedAt: string | null;
    decisionNote: string | null; // safe to show the host — it is written for them
    providerRefunded: boolean; // see §3
}

interface RefundEligibilityResponse {
    eligible: boolean;
    reasons: string[];
    hasPendingRequest: boolean;
}

interface RefundRequestAdmin {
    request: RefundRequestResponse;
    eventTitle: string;
    eventStatus: 'DRAFT' | 'ACTIVE' | 'FROZEN' | 'PURGED';
    eventStartAt: string | null;
    eventEndAt: string | null;
    paidAt: string | null;
    hostDisplayName: string | null;
    hostEmail: string | null;
    currentlyEligible: boolean;
    ineligibilityReasons: string[];
    guestCount: number;
    hostCount: number;
    postCount: number;
    mediaCount: number;
    storageBytes: number;
}
```

`amountMinor` is in **minor units** like everything else in billing. Format with `currency`; do not
assume two decimal places.

---

## 5. Refund error codes

| code                                | HTTP | when                                                                                          | what to show                                                                 |
| ----------------------------------- | ---- | --------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `5022` `REFUND_NOT_ELIGIBLE`        | 409  | a gate failed at request time, or the event was used while the request sat in the admin queue | the `detail` string — it is the joined `reasons` and is written for the host |
| `5023` `REFUND_ALREADY_REQUESTED`   | 409  | a request for this event is already awaiting a decision                                       | refetch eligibility; show the pending panel                                  |
| `5024` `REFUND_REQUEST_NOT_PENDING` | 409  | admin decided a request that was already decided                                              | almost always a double-click or a stale queue; refetch the queue             |
| `5025` `ORDER_NOT_REFUNDABLE`       | 409  | no settled activation payment exists, or it is no longer `PAID`                               | "There's no payment on this event to refund"                                 |
| `3010` `RATE_LIMITED`               | 429  | see §6                                                                                        | see §6                                                                       |

`detail` on `5022` is safe to render directly. It is assembled from the same `reasons` the
eligibility endpoint returns.

---

## 6. Rate limiting — the new `429`

**Every `/api/**` endpoint now has a request budget.** Endpoints without a specific limit get a
generous default (300 requests/minute per caller) that only a stuck client will ever hit.

Authenticated callers are counted **per user id**; anonymous ones per IP. Admin routes are _not_
exempt — an admin account can move money and destroy media, which makes a runaway script holding
admin credentials the most expensive kind to have.

### The response

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
    "retryAfterSeconds": 42,
}
```

### Handle it once, globally

Put this in your API client interceptor, not at call sites:

- **Do not auto-retry blindly.** Retrying a `429` immediately is what produced it. If you retry at
  all, wait `retryAfterSeconds` (or the `Retry-After` header — same value) and retry once.
- **Never retry a non-idempotent call automatically.** Checkout, refund requests, and admin
  approvals must surface to the user instead; a silently retried approval is a second refund.
- On user-facing surfaces show the wait: "Too many attempts. Try again in 42 seconds." The `detail`
  string already says exactly this if you would rather render it directly.
- Disable the submitting control for `retryAfterSeconds` rather than leaving a button that only
  fails again.

### The limits that will actually be hit

| endpoint                                | limit    | why it matters to you                                                                                                               |
| --------------------------------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `POST /api/auth/login`                  | 10 / min | a login form that retries on failure will trip this; make sure yours doesn't                                                        |
| `POST /api/auth/register`               | 5 / hour | a user who mistypes their email a few times can lock themselves out for the hour — say so clearly                                   |
| `POST /api/auth/refresh`                | 30 / min | if you refresh on every 401, a burst of parallel requests can trip it. Deduplicate: one in-flight refresh, queue the rest behind it |
| `POST /api/auth/guest-login`            | 20 / min | guests opening an invite link repeatedly                                                                                            |
| `POST /api/events/{id}/checkout`        | 10 / min | shared with `subscription-checkout`                                                                                                 |
| `POST /api/events/{id}/refund-requests` | 5 / hour | per user, not per event                                                                                                             |
| admin decisions and settlement          | 30 / min | per admin                                                                                                                           |

The refresh case is the one most likely to bite. If your client fires ten requests, all get a `401`,
and all ten independently call `/refresh`, you will hit the limit under ordinary use.

> **Counters are per-instance and in-memory.** With N app instances behind a load balancer the
> effective budget is N times the number above. These are a brake on runaway clients, not an edge
> defence — do not build anything that depends on the limit being exact.

---

## 7. The two new notifications

Refund decisions are the first notifications produced by a user action rather than the scheduled
sweep. They arrive through the existing feed — `GET /api/notifications`, `GET /api/notifications/unread-count`,
`PATCH /api/notifications/{id}/read` — with no new plumbing.

| `type`            | `severity` | when                                                          |
| ----------------- | ---------- | ------------------------------------------------------------- |
| `REFUND_APPROVED` | `CRITICAL` | the refund went through and the event has returned to `DRAFT` |
| `REFUND_REJECTED` | `INFO`     | the request was declined                                      |

Both are `category: "BILLING"`, which means they are **emailed as well as shown in the feed**. A
host who is not looking at the app is exactly the one who needs to hear that their event came down.

`ctaRoute` is `/events/{eventId}/settings/plan` for both — app-relative, as always.

The `payload` carries what the UI needs without a second fetch:

```jsonc
{
    "refundRequestId": "…",
    "orderId": "…",
    "amountMinor": 4900,
    "currency": "EUR",
    "providerRefunded": true,
}
```

`providerRefunded: false` on an approved refund means the money is being returned by hand. Do not
tell the host to expect it on their statement in the usual few days in that case.

`REFUND_APPROVED` is also the only notification that reports an event _losing_ its live status, so
it doubles as the explanation for a host who would otherwise find a draft they did not expect. Give
it real weight in the feed.

**Add both values to your notification type union.** Unknown types should already render as a
generic row rather than crashing — if yours does not, fix that before this ships.

---

## 8. Screens to build

- **Host — event billing page.** Refund section: eligibility-driven button, pending-review panel,
  decision history with the admin's note.
- **Host — refund confirmation dialog.** Must state that the event goes back to `DRAFT` and offline.
- **Admin — refund queue.** Evidence-first list per §3, approve/reject with a note field labelled as
  host-visible, and a visible warning wherever `providerRefunded` is false.
- **Global — `429` handling** in the API client per §6.
- **Global — the two notification types** in the feed and any email preview.

---

## 9. Still not built

Everything in `billing-payments-fe-integration.md` §11 still applies (no host-facing cancellation, no
invoices/receipts, no host-initiated plan changes), plus:

- **Partial refunds.** A refund is all-or-nothing on the activation order.
- **Refunding a renewal.** Only `ACTIVATION` orders are refundable.
- **Host-visible refund SLA.** There is no "we respond within N days" value to display; the queue is
  worked manually and nothing surfaces its depth.
- **Withdrawing a request.** A host cannot cancel a pending request — an admin has to reject it.

Say so if the refund screens need any of these. They are additions, not oversights.
