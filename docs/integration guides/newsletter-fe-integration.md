# FE integration: newsletter subscription and the signup reward

Shipped 2026-09-23. Three new public endpoints, two new `/api/me` endpoints, one new field on the
register body, and one new block each on `GET /api/config` and the admin metrics response. **Off by
default** — everything below is dark until `app.newsletter.enabled` is turned on, and `/api/config`
tells you which it is, so this can be built and deployed ahead of the switch.

## Why this exists

Someone who joins the mailing list gets one single-use discount code — 10% off the activation of
their next event, valid twelve months. The list itself lives in Brevo, which is where campaigns are
written and sent; the platform owns subscription, consent and the reward, and pushes confirmed
contacts across. Nothing about composing or sending a campaign is a frontend concern.

## The lifecycle

```
                    public form ──┐
  registration checkbox ─────────┼──► PENDING ──(confirm)──► CONFIRMED ──► code minted + emailed
       settings toggle ──────────┘                                │              (once, ever)
                                                                  │
                                            (unsubscribe) ────────┴──► UNSUBSCRIBED
                                                                       code stays redeemable
```

Two rules do most of the explaining:

- **One reward per person, ever.** Confirming twice, unsubscribing and resubscribing, or
  subscribing anonymously and later registering with the same address all produce exactly one code.
- **The code survives unsubscribing.** It was earned by confirming, and that happened. Do not tell
  a user that leaving the list costs them their discount — it does not.

---

## 1. `POST /api/newsletter/subscribe`

Unauthenticated.

```http
POST /api/newsletter/subscribe
Content-Type: application/json

{
  "email": "someone@example.com",   // required, max 255, must be an address
  "locale": "el"                    // optional, BCP-47, max 10
}
```

**Always `202 Accepted` with an empty body.** It says `202` for a brand-new address, an address
already pending, an address that confirmed months ago, and an address that unsubscribed. That is
deliberate: the endpoint is unauthenticated, so anything that distinguished those cases would let
anyone test whether a given address is known to the platform, one request at a time.

**So show one message — "Check your inbox to confirm" — and never branch on the response.** There
is nothing in it to branch on. A "you're already subscribed!" state is not implementable here and
should not be designed.

An unsupported `locale` is not an error; it falls back to English rather than costing a signup.
Only `en` and `el` are recognised today.

Failure modes worth handling: `400 VALIDATION_FAILED` for a malformed or missing address, `429` for
rate limiting (§8), and `404` while the feature is off (§6).

## 2. `POST /api/newsletter/confirm` and `POST /api/newsletter/unsubscribe`

Both unauthenticated, both take the same body, both answer `204 No Content` whatever happened —
including for a token that never existed, one that expired, and one that was already spent.

```http
POST /api/newsletter/confirm
Content-Type: application/json

{ "token": "<43-char token from the link>" }
```

**These are `POST`, not `GET`, and that is the whole reason a frontend page is involved.** A `GET`
that mutates gets fired by inbox scanners and antivirus link-prefetchers, which would confirm and
unsubscribe people who never clicked anything. So the emailed link points at **your** page, and
your page issues the `POST`.

The two routes the emails link to are fixed on the backend:

```
<public-base-url>/newsletter/confirm?token=<token>
<public-base-url>/newsletter/unsubscribe?token=<token>
```

**You need to build both pages.** Read `token` off the query string, `POST` it to the matching
endpoint, and show a success state on `204`. Since a bad token also returns `204`, there is no
failure branch to render — which is intended. The one thing to get right is not re-POSTing on
refresh.

The unsubscribe page is reached from two places and must work the same from both: the footer of the
reward email, and the footer of campaigns composed in Brevo, whose template links to this page
through the `UNSUBSCRIBE_URL` contact attribute the backend pushes. Both carry the same long-lived
token — it is never rotated and never spent, so a link mailed a year ago still works, and clicking
it twice is a no-op rather than an error.

An unsubscribe confirmation screen should offer a way back: `POST /api/newsletter/subscribe` with
the same address resubscribes, and the reward code is untouched either way.

`token` is rejected at the boundary above 64 characters (`400`); real tokens are 43.

## 3. The registration checkbox

`POST /api/auth/register` accepts one new optional field:

```ts
interface RegisterRequestDto {
  // ...existing fields unchanged...
  subscribeToNewsletter?: boolean;   // NEW
}
```

**There is no second confirmation email in this flow.** The verification email the new account
already receives is the proof of address, and clicking its link confirms the subscription at the
same moment it verifies the account. One email, one click, both things done.

So: a checkbox on the signup form, unchecked by default, and no extra copy about confirming the
newsletter separately. If you want a line, "we'll send your discount code once you verify your
email" is accurate.

The field is **ignored, not rejected**, while the feature is off — sending it can never make
registration fail.

After verification the new subscriber receives the reward email. That does mean two emails land
together at that point (welcome + reward); it is deliberate, since the second one carries the code.

## 4. `GET` / `PUT /api/me/newsletter`

Authenticated, `ROLE_USER` or `ROLE_ADMIN`. **Guests get `403`** — a guest account has no address
of its own to consent with, so do not render the control for them.

```http
GET /api/me/newsletter
```
```ts
interface NewsletterStatusResponseDto {
  subscribed: boolean;             // true only while CONFIRMED
  confirmedAt: string | null;      // ISO-8601 with offset
  rewardCode: string | null;       // e.g. "NL-7QK2MX9WVB"
  rewardExpiresAt: string | null;
}
```

Someone who never subscribed gets `{subscribed: false, ...nulls}` and **not** a `404` — "you are not
subscribed" is an answer, not a missing resource.

**`rewardCode` is non-null only while checkout would actually accept it.** A code that has been
spent, has lapsed, or was disabled comes back as `null`, with `rewardExpiresAt` null alongside it.
The backend asks exactly the question checkout asks, so the settings screen and the checkout screen
can never disagree about whether the user has an offer to use. Render the code block when
`rewardCode` is non-null and nothing at all when it is null — do not keep a stale copy of the code
in local state and show it after it has been used.

```http
PUT /api/me/newsletter
Content-Type: application/json

{ "subscribed": true }     // required; an absent field is a 400, not "unsubscribe"
```

Answers `204`. Two different things happen behind it, and the UI copy has to cover both:

- **Verified address** (the normal case): subscribed and rewarded immediately, no email to confirm.
  A `GET` straight after will show `subscribed: true` and the code.
- **Unverified address**: goes through the ordinary double opt-in — a confirmation email is sent and
  a `GET` straight after still shows `subscribed: false`. Otherwise an account could mint itself a
  discount for an address it has never shown it owns.

So after a successful `PUT true`, re-fetch rather than assuming; if the result is still
`subscribed: false`, show "check your inbox" instead of "you're subscribed".

`PUT false` is an immediate unsubscribe, idempotent, and does not touch the reward.

## 5. The reward at checkout

The code is an **ordinary discount code**. There is no newsletter-specific checkout path, no new
field, and no auto-apply — the user types or pastes it into the same code field that already
exists:

```http
POST /api/events/{eventId}/checkout
{ "collaborationCode": "NL-7QK2MX9WVB", ... }
```

and previews it the same way, through `POST /api/events/{eventId}/checkout/preview-code`. See
[`billing-fe-guide.md`](billing-fe-guide.md).

Three properties to reflect in the UI:

- **Activation only.** Since 2026-09-22 no discount code prices anything but an event's activation.
  Sending it alongside a `targetPlanTierCode` is refused with `409 DISCOUNT_NOT_APPLICABLE_TO_UPGRADE`
  (5076), so do not offer the reward on the upgrade or storage-pack screens.
- **Single use.** One redemption and it is gone; `GET /api/me/newsletter` stops returning it.
- **Codes are typed, not applied for the user.** Surfacing it on the settings screen with a
  copy-to-clipboard button is the intended affordance. It is deliberately not pre-filled at
  checkout.

The format is `NL-` plus ten characters from a Crockford-style alphabet with `O`, `0`, `I`, `1`,
`L` and `U` removed, because people retype it by hand. Uppercase it on input if your field is
lenient; do not validate the shape client-side beyond that.

## 6. The kill switch

`app.newsletter.enabled` is `false` by default and is a deploy-time property, not a platform
feature flag.

- `/api/newsletter/subscribe`, `/confirm` and `/unsubscribe` return **`404`** while it is off. Not
  `403`: while off, those routes do not exist.
- `/api/me/newsletter` stays reachable either way. `GET` returns an unsubscribed status and `PUT`
  answers `204` while doing nothing.

`GET /api/config` publishes it, so gate the UI on that rather than on a build-time flag of your
own:

```ts
interface AppConfigResponseDto {
  // ...existing fields unchanged...
  newsletter: {
    enabled: boolean;              // false ⇒ hide the form, the checkbox and the settings toggle
    discountPercent: number;       // 10
    rewardValidityMonths: number;  // 12
  };
}
```

`discountPercent` and `rewardValidityMonths` are there so the signup copy — "get 10% off your next
event, valid 12 months" — comes from the server rather than from a hard-coded string that drifts
when the property changes. They describe the offer made to whoever subscribes **next**; a reward
somebody already holds keeps the terms it was minted with, so use `rewardExpiresAt` from
`GET /api/me/newsletter` (§4) to describe an existing code, never these.

## 7. Admin metrics

`GET /api/admin/metrics` gains one block:

```ts
interface PlatformMetricsResponseDto {
  // ...existing fields unchanged...
  newsletter: {
    pending: number;         // subscribed, not yet confirmed — on no list, holding no reward
    confirmed: number;       // the mailing list; should match Brevo's own count
    unsubscribed: number;
    rewardsIssued: number;   // codes ever minted
  };
}
```

Counts only — there is no endpoint that lists subscribers, by design. `rewardsIssued` can exceed
`confirmed`, because a code outlives its owner's subscription; that is not a bug to report.

## 8. Rate limits

On top of the platform-wide budget described in
[`refunds-rate-limits-fe-integration.md`](refunds-rate-limits-fe-integration.md) §6:

| Endpoint | Budget |
| --- | --- |
| `POST /api/newsletter/subscribe` | 60/min per caller, **and 3/hour per email address** |
| `POST /api/newsletter/confirm` | 20/min per caller |
| `POST /api/newsletter/unsubscribe` | 60/min per caller |
| `PUT /api/me/newsletter` | 10/hour per user |

The per-address budget is the one you are most likely to meet: it is what stops an address being
mail-bombed with confirmation emails, and three is enough for a typo and a retry. It answers the
ordinary `429` with `Retry-After`, and the message to show is about that address, not about the
user's connection.

## 9. One thing still missing

Outgoing mail does not set the `List-Unsubscribe` / `List-Unsubscribe-Post` headers, so the native
unsubscribe button in Gmail and Apple Mail does not appear. Nothing on your side depends on it —
the footer link covers the same ground — but it is the remaining gap against the original design.
