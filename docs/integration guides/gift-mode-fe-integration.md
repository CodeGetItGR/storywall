# FE integration: gift mode (buy the wall for someone else, hand it over with a claim card)

Shipped 2026-09-27 on `feature/gift-mode` (migration V126). Additive for every existing screen:
new endpoints, one new field on plan tiers (`isGiftable`), one on billing orders (`paidByCaller`)
and one on the invite preview (`gift`). Nothing existing changes shape. The one behaviour change is
on gift events only: billing hides the amounts of orders the reading host didn't pay (§6).

Spec: `docs/superpowers/specs/2026-09-27-gift-mode-design.md`. Types:
`docs/frontend-api-types.ts`, block "Gift mode (2026-09-27)".

Not to be confused with `EventGiftAccount` / `/api/events/{id}/gift-account`, which is the
wishlist's IBAN. That feature is unrelated.

## 1. What it is

Somebody other than the honorees buys the wall as a gift: the koumbaros or koumbara at a wedding,
the nonos or nona at a baptism, a friend for a 40th birthday. The giver pays, sets the wall up in
secret, and hands it over with a printed **claim card** whenever they choose: right after buying,
at the engagement party, or on the day itself. Whoever claims the card becomes the event's owner
(primary host). The giver stays on as a co-host.

Ownership can't move while any consumer purchase on the event is inside its 14-day withdrawal
window. This is the same lock `POST /api/events/{eventId}/hosts/{id}/primary` already has
(5081). It stops a new owner withdrawing, and getting refunded to the giver's card, something they
didn't pay for. A claim made inside the window therefore makes the recipient a **co-host at once**.
An hourly sweep makes them the primary host once the last window closes. A co-host can already
manage content, members, invitations and settings, so the recipient loses very little while
waiting. Business (B2B) orders have no window and never delay the swap.

## 2. When to offer it

Offer "Buy as a gift" only for a plan where both hold:

- `PlanTierResponseDto.isGiftable === true`. The field is on `GET /api/config` (`planTiers[]`) and
  `GET /api/plan-tiers`. It defaults to `true`, and an admin can switch it off per plan
  (`isGiftable` on `POST`/`PATCH /api/admin/plan-tiers`).
- The plan's `moduleKeys` includes `co_hosts`. The recipient joins as a co-host and the giver stays
  one, so a plan without it can't be gifted.

If either fails, `PUT …/gift` and `POST …/gift/card` answer 409 **5089**. The flag only means
anything on EVENT-scope plans.

## 3. Giver flow

1. **Create the event** as usual (draft, plan, coverage option).
2. **Declare the gift** with `PUT /api/events/{eventId}/gift`. Requires `ROLE_USER` and the
   caller must be the event's **primary host** (otherwise 403 **4011**). Allowed on `DRAFT` and
   `ACTIVE` events, not on a soft-deleted one (409 **5092**).

   ```json
   { "recipientLabel": "Maria & Giorgos",          // required, max 120
     "giverDisplayName": "Nikos, your koumbaros",  // required, max 80
     "recipientEmail": "maria@example.com" }       // optional, valid email, max 255
   ```

   The first call creates the gift (`status: NOT_ISSUED`). Later calls edit it: it is a full
   replace, so sending `recipientEmail: null` (or leaving it out) clears the address. Editing works
   while the gift is `NOT_ISSUED`, `ISSUED`, `LOCKED` or `VOID`, and does not change the card's
   token or PIN. Once the gift is `CLAIMED` or `COMPLETED` it answers 409 **5090**. Returns
   `GiftHandoverResponseDto`.
3. **Pay** through the normal activation checkout. Nothing gift-specific happens here and the price
   is the plan's normal price.
4. **Issue the card** with `POST /api/events/{eventId}/gift/card` (no body). Requires `ROLE_USER`
   and primary host (403 **4011**). The event must be `ACTIVE`, meaning paid for, and not deleted
   (409 **5092**), so a card can never lead the recipient into an unpaid draft. With no gift
   declared it returns 404. On a `CLAIMED`/`COMPLETED` gift it returns 409 **5090**. Rate limit:
   10 per hour per caller.

   Response `GiftCardResponseDto`: `{ "token": "<uuid>", "pin": "048213" }`.

   **This is the only response that ever carries the PIN.** No endpoint returns it again, and it
   is stored only as a hash. Show it once and tell the giver to write it down or print it now.
5. **Print.** See §4.

**Reprinting** the same card: `GET /api/events/{eventId}/gift` returns the live `token`, so the QR
can be redrawn at any time. The PIN can't be recovered. If the giver lost it, the only option is to
**reissue**: call `POST …/gift/card` again. Reissuing creates a new token and a new PIN and resets
the attempt counter. **The old token and PIN stop working at once.** The old card's preview and
claim then return 404. Reissuing is also how a `LOCKED` card is revived, and how a `VOID` gift is
restarted. Put a clear "this invalidates the card you already printed" confirmation in front of
it.

**Status page** for the gift: `GET /api/events/{eventId}/gift`. Requires an authenticated caller
who is any host of the event, co-hosts included. Returns 404 when the event isn't a gift.
`GiftHandoverResponseDto`:

| Field | Meaning |
|---|---|
| `status` | `NOT_ISSUED` · `ISSUED` · `LOCKED` (5 PIN attempts used) · `CLAIMED` (recipient is a co-host, swap pending) · `COMPLETED` (recipient owns it) · `VOID` (the recipient stopped being a host before the swap) |
| `recipientLabel`, `giverDisplayName`, `recipientEmail` | As declared. `recipientEmail` is null if none was given. |
| `token` | The live card's claim token. Null until a card is issued. |
| `cardIssuedAt` | When the live card was issued. Null before that. |
| `claimedByDisplayName`, `claimedAt` | Who claimed it and when. Null until claimed. Reissuing a `VOID` gift clears them. |
| `ownershipTransfersAt` | Only while `CLAIMED`: when the last open withdrawal window closes. Computed live, so it moves later if an upgrade or extension is bought meanwhile. Also null while `CLAIMED` when the date is unknown: a withdrawal is under review, or the event is deleted or not `ACTIVE` (see "Paused handovers" below). Null in every other status. |
| `ownershipTransferredAt` | When ownership actually moved. Null until `COMPLETED`. |

The response never contains the PIN or its hash.

While a gift is `CLAIMED`, nobody can transfer primary status by hand:
`POST /api/events/{eventId}/hosts/{id}/primary` answers 409 **5093** `GIFT_HANDOVER_PENDING`,
even to the recipient and even once every window has closed. The sweep makes the swap. Hide the
transfer action while `status === 'CLAIMED'`. The endpoint's withdrawal-window lock (5081) still
applies at other times.

While a gift is `CLAIMED`, the recipient's host row is protected too: only the recipient (leaving)
or the primary host may remove it with `DELETE /api/event-hosts/{id}`. Any other co-host gets 403
**4012** `GIFT_RECIPIENT_PROTECTED`. Removing the recipient voids the gift at the next sweep.

**Paused handovers.** A `CLAIMED` gift waits, with `ownershipTransfersAt: null`, while:

- **a withdrawal is under review** (`PENDING` or `HELD`) on the event. The swap happens at the
  first sweep after the review is decided, if the event is still live and no window is open.
- **the event is soft-deleted.** If a host cancels the deletion, the handover resumes at the next
  sweep. If the deletion came from a withdrawal of the whole event, it can't be cancelled (409
  **5071** `EVENT_WITHDRAWN`) and the gift stays `CLAIMED` until the event is purged, when the gift
  row goes with it. Show it as "this gift can't be completed" rather than a pending date.
- **the event isn't `ACTIVE`.** The sweep skips it and resumes once it is `ACTIVE` again. Nothing in
  the backend moves a paid event back to `DRAFT` today, so this is a safety net.

The status stays `CLAIMED` throughout; don't read a null `ownershipTransfersAt` on a `CLAIMED`
gift as "any minute now".

## 4. Card rendering

The backend does not render cards. The FE draws them.

- **QR:** encode `${window.location.origin}/gift/{token}` (for example with `qrcode.react`). The
  `/gift/{token}` route is yours to build; it calls the preview endpoint in §5.
- **PIN:** print it on the card, or keep it off the card so the giver can put it in the envelope.
  That choice belongs to the giver.
- **Copy:** use `giverDisplayName` ("Nikos, your koumbaros") and `recipientLabel`
  ("Maria & Giorgos"). They are the giver's own words, so don't add a prefix like "From".
- If `recipientEmail` was set, the card can say "sign in with maria@… to claim". That account
  won't need the PIN.

## 5. Recipient flow

### 5.1 Preview (public)

`GET /api/gift-claims/{token}` needs no auth. Rate limit: 60 per minute per caller. Returns 404
for an unknown token, a token superseded by a reissue, and a token on a soft-deleted event.

`GiftClaimPreviewDto`:

| Field | Meaning |
|---|---|
| `eventTitle`, `eventSubtitle` | `eventSubtitle` is nullable. |
| `coverMedia` | `MediaResponseDto` with a presigned `mediaUrl`, or null without a cover. Use this and not `GET /api/medias/{id}`, which the visitor can't call. |
| `giverDisplayName`, `recipientLabel` | For the "a gift from … for …" header. |
| `emailBound` | `true` when the giver named a recipient address. Tell the visitor that signing in with the invited address skips the PIN. The address itself is never sent. |
| `state` | `CLAIMABLE` (card is live), `LOCKED` (show "ask the giver for a new card"), `ALREADY_CLAIMED` (claimed, pending or complete), `VOID` (the person who claimed it stopped being a host before the handover; show "this card is no longer valid, ask the giver for a new one"). `VOID` is new since the first version of this guide: treat an unknown `state` as not claimable. |

**`CLAIMABLE` does not mean the claim will succeed.** The preview reads only the card, not the
event's status. If the event isn't `ACTIVE`, the preview still says `CLAIMABLE` and the claim
answers 409 **5092**. Handle 5092 on the claim, for example "This gift isn't ready
to be claimed right now; check with the giver".

### 5.2 Sign in

The claim needs `ROLE_USER` with a **verified email address**. Guest accounts and accounts with
an unconfirmed address are refused with 403 **4009**. Send a signed-out visitor through
login/register and bring them back to `/gift/{token}`. If they just registered, they must confirm
their email before claiming.

### 5.3 Claim

`POST /api/gift-claims/{token}/claim`. Requires `ROLE_USER`. Rate limit: 10 per minute per caller.
The body is optional:

```json
{ "pin": "048213" }   // exactly 6 digits; anything else is 400/3001 and uses no attempt
```

**Who needs the PIN:**

- A caller whose verified account email matches the gift's `recipientEmail` (case-insensitive,
  trimmed) claims **without a PIN**. The attempt counter isn't touched, and a PIN sent anyway is
  ignored.
- **Anyone else needs the PIN.** A missing PIN gets 400 **3036** with `details.attemptsLeft`
  set to the attempts still left, and **does not use an attempt**. Use it to show the PIN field.

**Attempts: 5 per card, and every PIN attempt uses one, correct or wrong.** The server reserves
the attempt *before* comparing the PIN, which stops parallel guesses from getting past the limit.
The consequences:

- A wrong PIN returns 400 **3036**, `details.attemptsLeft` = attempts remaining. `0` means this
  attempt locked the card.
- A **correct** PIN also uses its attempt. If the claim then fails for another reason, the attempt
  stays used. Examples are the co-host cap (5088), the member cap (5009), or losing a race to
  another claimer (5090). Don't tell the user a failed correct-PIN claim was free.
- After 5 attempts the card is `LOCKED`, and every further claim returns 409 **5091**. That
  includes a card whose attempts were used by correct-PIN claims that failed later. The fix is on
  the giver's side: they reissue the card (§3), which also gives a new PIN.

Only a supplied PIN from a non-matching account uses an attempt. The refusals that come before
the PIN check use none: 404, 5090, 5091, 5092, 4009, 5012.

**Refusals, in the order the server checks them:**

1. 404: unknown or superseded token.
2. 409 **5091**: card locked. 409 **5090**: already claimed (also returned for a `VOID` gift,
   which the preview reports as `VOID`).
3. 409 **5092**: the event isn't `ACTIVE`, or is deleted.
4. 403 **4009**: guest account, or email not verified.
5. 403 **4009**: the caller is the giver ("you can't claim your own gift").
6. 409 **5012** `MODULE_NOT_AVAILABLE`: `co_hosts` isn't available on the event.
7. 403 **4009**: the caller is already the event's primary host.
8. PIN handling as above: 3036 or 5091. A caller with no PIN on a card whose 5 attempts are
   already used (by correct-PIN claims that failed later) gets 409 **5091**, and the card is
   locked, rather than a 3036 with `attemptsLeft: 0`.
9. 409 **5088** co-host cap, or 409 **5009** member cap, when adding the recipient as co-host.
   Both carry quota `details`.
10. 409 **5090**: another claim, or a reissue, committed first. Nothing from this claim is kept
    except the used PIN attempt.

So **4009** covers three cases: a guest or unverified account, the giver, and a caller who is
already the primary host. Tell them apart by the `detail` text if you need to. That text is
English only and not localised, so show your own copy.

A caller who is already a **co-host** of the event, for example one the giver added by hand, can
claim. Their existing host row is kept and no second one is added.

**Response `GiftClaimResponseDto`**, 200:

| Outcome | `status` | `ownershipTransfersAt` | What it means |
|---|---|---|---|
| No withdrawal window open | `COMPLETED` | `null` | The caller is the primary host now. The giver is a co-host. |
| A consumer order's window is open | `CLAIMED` | the date the last window closes | The caller is a **co-host now** and becomes primary host at that date. An hourly sweep makes the swap, so allow up to an hour after the date. Tell the user, e.g. "The wall is yours; full ownership moves to you on 12 October". |
| A withdrawal is under review on the event (`PENDING` or `HELD`), window open or not | `CLAIMED` | `null` | The caller is a **co-host now**. The date depends on how the review is decided, so show no date, e.g. "The wall is yours; full ownership moves to you shortly". |

After a `CLAIMED` response, `GET /api/events/{eventId}/gift` shows the current transfer date. It
moves later if a purchase opens a new window, for example an upgrade the giver buys, and is null
while the handover is paused (§3, "Paused handovers"). If the recipient leaves, or the primary host
removes them, before the swap, the sweep sets the gift to `VOID` and the giver can reissue. Other
co-hosts can't remove them (403 **4012**).

## 6. Hidden prices

On a gift event, an order's price belongs to whoever paid it. This is etiquette, not secrecy:
catalog prices are public.

`GET /api/events/{eventId}/billing` (any host) now has `paidByCaller` on every
`orders[]` entry:

- `paidByCaller: true` means the caller paid this order.
- `paidByCaller: false` means someone else paid it, or no buyer is recorded (orders before V102).
  **On a gift event**, such an order has `amountMinor`, `addonAmountMinor`, `setupAmountMinor`,
  `eventDayAmountMinor`, `hostingAmountMinor` and `breakdown` all **`null`**. Render "Gift" (or
  "Paid by another host") instead of a price. `kind`, `status`, `currency`, dates, coverage months
  and `buyerType` are still filled in.
- On a non-gift event nothing is hidden, whatever `paidByCaller` says. This endpoint always sets
  the flag. It is only `null` on internal, non-caller views.
- The event-level `discount` is `null` on a gift event **unless the caller paid the activation**.
- `addons[].priceAmountMinor` is `null` on a gift event unless the caller paid the storage-pack
  order that bought that add-on. Type it `number | null`.

`OrderSummary.amountMinor` was documented as never null. On a gift event it can now be null, so
type it `number | null` and guard any formatting.

The same rule works both ways: once the recipient owns the event, an extension they buy is hidden
from the giver.

**Withdrawals.** They are still for the primary host only (403 4005 for anyone else). On a gift
event, the primary host may only withdraw orders they paid for:

- `GET /api/events/{eventId}/withdrawal-preview`, `POST /api/events/{eventId}/withdrawals`,
  `GET /api/events/{eventId}/orders/{orderId}/withdrawal-preview` and
  `POST /api/events/{eventId}/orders/{orderId}/withdrawals` return 403 **4010** when the
  order (for the event-level ones, the activation) was paid by someone else.
- `GET /api/events/{eventId}/withdrawals` lists only the caller's own withdrawals: those for
  orders they paid, or, for requests with no order, those they filed.

Hide "Withdraw" on orders with `paidByCaller === false` on a gift event rather than waiting for
the 4010.

## 7. Invite landing

`GET /api/event-invitations/{inviteToken}/preview` has a new field, `gift`. It is `null` on a
normal event and a `GiftFramingDto` on a gift event:

```json
"gift": { "giverDisplayName": "Nikos, your koumbaros",
          "recipientLabel": "Maria & Giorgos",
          "claimed": false }
```

Use it to frame the page, e.g. "a surprise from Nikos for Maria & Giorgos". `claimed` is `true`
once the gift is `CLAIMED` or `COMPLETED`. While it is `false` the honorees may not know yet, so
don't spoil the surprise in copy shown to guests who might pass it on.

## 8. Errors

Every error uses the usual ProblemDetail shape (`errorCode`, `errorKey`, `detail`), plus
`details` where noted.

| HTTP | `errorCode` | `errorKey` | Where | Meaning / what to do |
|---|---|---|---|---|
| 400 | 3036 | `GIFT_CLAIM_PIN_INVALID` | claim | Wrong PIN, or no PIN from a non-matching account. `details.attemptsLeft`: `0` means this attempt locked the card. A missing PIN uses no attempt. |
| 400 | 3001 | `VALIDATION_FAILED` | declare, claim | Body validation, e.g. a PIN that isn't 6 digits, or a missing label. Uses no attempt. |
| 403 | 4009 | `GIFT_CLAIM_NOT_ALLOWED` | claim | Guest or unverified account; the giver; or the caller is already the primary host. |
| 403 | 4010 | `GIFT_ORDER_NOT_YOURS` | withdrawal preview/file | On a gift event, the order was paid by another host. |
| 403 | 4011 | `GIFT_NOT_PRIMARY_HOST` | declare, issue card | Only the primary host can declare the gift or issue its card. |
| 403 | 4012 | `GIFT_RECIPIENT_PROTECTED` | `DELETE /api/event-hosts/{id}` | The host being removed claimed the gift and is waiting for the handover (`CLAIMED`). Only they (leaving) or the primary host can remove them. |
| 403 | 5101 | `DEMO_EVENT_LOCKED` | declare, claim | The event is a demo. A demo can't be given, and a non-admin can't claim a gift on an event designated a demo since. |
| 404 | 2001 | `RESOURCE_NOT_FOUND` | all | Unknown or superseded token, a token on a deleted event (preview), an event that isn't a gift (`GET …/gift`, `POST …/gift/card`). |
| 409 | 5009 | `EVENT_MEMBER_LIMIT_EXCEEDED` | claim | Member cap, when the recipient wasn't a member yet. Quota `details`. The PIN attempt, if any, is used. |
| 409 | 5031 | `CHECKOUT_SESSION_UNRESOLVED` | claim | The handover closes every checkout still open on the event, as a manual transfer does, and one may be being paid right now. Nothing moved; retry in a minute. The PIN attempt, if any, is used. |
| 409 | 5012 | `MODULE_NOT_AVAILABLE` | claim | `co_hosts` isn't available on the event. |
| 409 | 5088 | `EVENT_CO_HOST_LIMIT_EXCEEDED` | claim | Co-host cap. Quota `details`. The PIN attempt, if any, is used. |
| 409 | 5089 | `GIFT_NOT_AVAILABLE_ON_PLAN` | declare, issue card | Plan has `isGiftable: false` or no `co_hosts`. |
| 409 | 5090 | `GIFT_ALREADY_CLAIMED` | declare, issue card, claim | Already claimed. On claim this also covers a `VOID` gift and a claim that lost a race. |
| 409 | 5091 | `GIFT_CARD_LOCKED` | claim | All 5 attempts used. The giver must reissue. |
| 409 | 5092 | `GIFT_EVENT_NOT_ACTIVE` | declare, issue card, claim | Card and claim need an `ACTIVE`, non-deleted event. Declare needs `DRAFT` or `ACTIVE`, non-deleted. A preview can say `CLAIMABLE` while the claim returns this. |
| 409 | 5093 | `GIFT_HANDOVER_PENDING` | `POST /api/events/{eventId}/hosts/{id}/primary` | A claimed gift is waiting to hand the event over (`CLAIMED`). No manual transfer until it completes or is voided. |
| 429 | 3010 | `RATE_LIMITED` | preview, claim, issue card | Preview 60/min, claim 10/min, issue card 10/hour, per caller. `Retry-After` header. |

## 9. Not in v1

1. **Emails.** Nothing is sent to the giver on claim, nothing to the recipient when ownership
   moves, and there are no reminders. The FE shows the state.
2. **Several payers splitting one gift.** One giver pays. There are no contribution links.
3. **Gift vouchers.** No prepaid code for the recipient to redeem in their own checkout.
4. **Handover for planners, venues and promoters.** Not offered to professional accounts, and there
   is no price-free handover certificate.
5. **Server-rendered cards.** No PDF card from the backend. The FE renders the card and the QR
   (e.g. `qrcode.react`).
6. **Gift-specific pricing.** No surcharge, wrapping or gift-only promotion. A gift costs the plan's
   normal price.

## Checklist

- [ ] Show "Buy as a gift" only when `isGiftable` is true and `moduleKeys` includes `co_hosts`.
- [ ] Giver: declare (`PUT …/gift`), pay, then issue the card (`POST …/gift/card`). Show the PIN
      once, clearly.
- [ ] Reprint from `GET …/gift`'s `token`. Put reissue behind an "invalidates the old card"
      confirmation.
- [ ] Build `/gift/{token}`: preview → sign in (verified, non-guest) → claim. Handle 3036
      (`attemptsLeft`), 5091, 5092, 4009, 5088/5009, 5090, 404.
- [ ] Render `CLAIMED` + `ownershipTransfersAt` as "co-host now, owner on …", and `CLAIMED` with a
      null date as "co-host now, owner soon" (paused, §3). Render `COMPLETED` as "it's yours".
- [ ] Preview: handle `state: 'VOID'`.
- [ ] While `CLAIMED`: hide transfer-primary (5093), and hide "remove host" on the recipient for
      co-hosts other than the primary host (4012).
- [ ] Billing: when `paidByCaller === false` on a gift event, amounts are null, so show "Gift". Hide
      Withdraw on those orders. Type `amountMinor` as nullable.
- [ ] Invite landing: use `gift` for framing when non-null.
