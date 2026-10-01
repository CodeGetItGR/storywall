# Withdrawal confirmation token & payment receipt — FE integration

2026-09-28. Section 1 is **breaking**: both withdrawal POSTs refuse a request without a token. Deploy
the frontend change together with the backend.

## Why

A withdrawal is terminal. A refunded activation deletes the event in the same call. The "Confirm
withdrawal" modal is frontend-only, so a retried request, another client, or a future screen that
skips the modal could withdraw in one POST. Art. 11a CRD (Dir. 2023/2673) asks for two steps: the
statement, then a separate "Confirm withdrawal" button. The backend now enforces the second step. A
withdrawal must carry proof that the host was shown the preview, and it must still match the amount
the host saw.

This is not an OTP, and it adds no step for the host. An email code would make withdrawing harder
than buying, which the directive forbids. It would also lock out a host who can't reach their inbox.
The flow the host sees is unchanged: preview, modal, confirm.

## 1. The confirmation token (breaking)

Both previews return a new field, and both POSTs require it back:

| Preview | POST |
|---|---|
| `GET /api/events/{eventId}/withdrawal-preview` | `POST /api/events/{eventId}/withdrawals` |
| `GET /api/events/{eventId}/orders/{orderId}/withdrawal-preview` | `POST /api/events/{eventId}/orders/{orderId}/withdrawals` |

```ts
// WithdrawalPreviewDto
confirmationToken: string;   // opaque; always present, refused previews included

// WithdrawalRequestCreateDto: the POST body is now required
{ reason?: string | null; confirmationToken: string }
```

Flow:

1. Fetch the preview when the modal opens, and show its lines and `totalRefundMinor`.
2. When the host clicks **Confirm withdrawal**, POST that same preview's `confirmationToken`.
3. On `409` with errorCode `5095`, fetch the preview again and show the new amount. Don't retry
   silently: the host confirmed an amount that no longer applies.

The token:

- is valid for **10 minutes** (`app.billing.withdrawal.confirmation-ttl-minutes`). If the modal
  can stay open longer, re-fetch the preview on confirm when it's older than about 9 minutes.
- is bound to the event, the order, the scope (EVENT or ORDER) and the user, so a token from one
  preview never works on another.
- is bound to what the preview showed: whether it was eligible and `totalRefundMinor`. The POST
  recomputes under the lock. If the total differs (a day boundary passed, the event date moved,
  another upgrade was bought), nothing is filed and the POST answers 5095.
- is not single-use. Sending it again within 10 minutes reaches the normal gate, which refuses a
  claim that is already withdrawn (5073 and friends), as before.
- is not a JWT, and never works as a login token.

New error codes. Neither one files a request or sends the acknowledgement email:

| Code | Name | HTTP | When |
|---|---|---|---|
| 5094 | `WITHDRAWAL_CONFIRMATION_INVALID` | 400 | The token is missing, malformed, forged, or for another event, order, scope or user |
| 5095 | `WITHDRAWAL_PREVIEW_STALE` | 409 | The token expired, or the withdrawal would now refund a different amount or different orders |

A POST with no body at all is also a 400, from bean validation (`confirmationToken` is
`@NotBlank`).

The token is checked before anything else. A non-host POSTing a made-up token gets 5094, not 4005.
The preview is where 4005, 5082 and 404 still show up first, and the frontend always calls it first.

## 2. Payment confirmation email (no API change)

The email a buyer gets when a payment settles has been redesigned. Nothing in the API changed; this
is here so support and the frontend know what hosts receive.

- **The body is laid out as a receipt** (`EmailLayout.composeReceipt`). Other emails keep the
  shared layout. From top to bottom:
  - "Payment received", a one-line intro, then the amount large with "Paid <date>" under it.
  - **What you bought:** one row per item. The name and its withdrawal rule sit on the left, and
    the price on the right, with the list price struck through when discounted. Then a total row
    and the VAT note. Business buyers get no per-line rule; the notice below states it once.
  - **Key dates:** event date and coverage end, with one "Times are in Athens time" note.
  - **Notice callout:** for a consumer, "Your right to withdraw", with the last day, a mention of
    the attached PDF, and a "Read the withdrawal terms →" link. For a business, "Business purchase".
  - The "View billing" button.
  - **Order details**, in small print: order id, event, buyer (name and email, or legal name and
    VAT number), terms version, seller (`LEGAL_TRADER_NAME`).
- **The full withdrawal information and model form are no longer inline.** A consumer gets them as
  a PDF attachment, `withdrawal-rights-<orderId>.pdf`, in their language, with the order details at
  the top. The body links to the same texts online:
  `{appBaseUrl}/legal/withdrawal-terms?version=<the order's terms version>`, the storywall page that
  already exists.
- A business purchase gets no PDF, only the note that the consumer right doesn't apply, as before.

Why a PDF and not only the link: Art. 8(7) CRD requires the confirmation, withdrawal information
included, on a *durable medium*. The CJEU has held that a link to a website isn't one (C-49/11
*Content Services*), because the page can change and the buyer keeps nothing. An attachment is a
copy the buyer keeps. Counsel should confirm this, along with the texts themselves, which are still
marked "Drafted for review by counsel".

## 3. Unchanged

- The withdrawal acknowledgement email (Art. 11a(3)) was already sent for every filed request,
  refused ones included, by `WithdrawalAcknowledger`. It still is. A request stopped by 5094 or 5095
  was never filed, so it sends nothing.
- Preview contents, refusal codes, and the HELD/REFUNDED outcomes.
