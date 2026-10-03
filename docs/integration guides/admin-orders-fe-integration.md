# Admin orders — FE integration

**Audience:** the admin panel. **Types:** `AdminOrderSummaryDto`, `AdminOrderDetailDto`, `RefundSource`,
`CheckoutLine` in [`frontend-api-types.ts`](../frontend-api-types.ts). **Added:** 2026-10-02.

Two new admin pages: a list of every order on the platform, and a page for one order. Both are read-only.
Settling an order by hand stays on the existing `POST /api/admin/orders/{orderId}/settle`. The CSV for the
accountant is a separate download: see [accounting-export-fe-integration.md](accounting-export-fe-integration.md).

## 1. The list

`GET /api/admin/orders` returns `Page<AdminOrderSummaryDto>`, in the standard `{ content, page }` shape.

| Param | Type | Notes |
|---|---|---|
| `page`, `size` | number | 0-indexed; `size` defaults to 50, max 100 |
| `status` | `OrderStatus` | `PENDING`, `PAID`, `FAILED`, `CANCELLED`, `REFUNDED` |
| `kind` | `OrderKind` | `ACTIVATION`, `UPGRADE`, `STORAGE_PACK`, `EXTENSION` |
| `buyerType` | `BuyerType` | `CONSUMER`, `BUSINESS` |
| `provider` | string | `STRIPE` or `MANUAL` |
| `from`, `to` | `YYYY-MM-DD` | days the order was **placed**, both inclusive, Athens time |
| `disputeOpen` | boolean | `true`: a chargeback is open; `false`: none open |
| `comp` | boolean | `true`: settled by an admin with no money taken |
| `eventId` | uuid | every order on one event, including a purged one |
| `buyerId` | uuid | every order one user bought |
| `q` | string | order id, Stripe payment id (`pi_…`, exact), or part of the buyer's email or the event title; max 200 characters |

- Every param is optional, and they combine with AND.
- The order is fixed: newest first. A `sort` param is ignored.
- A bad enum value, a bad uuid or date, an unknown `provider`, `to` before `from`, or a `q` over 200
  characters returns 400 `VALIDATION_FAILED`.
- A non-admin gets 403.

### Rendering a row

| Show | From |
|---|---|
| Date | `paidAt ?? createdAt`. A `PENDING`, `FAILED` or `CANCELLED` order was never paid. |
| Event | `eventTitle`. When `eventPurged` is true, the event no longer exists: show the title as plain text with a "purged" tag, not as a link. |
| Buyer | `buyerName` and `buyerEmail`. When the account was deleted, `buyerId` and `buyerEmail` are null, and so is `buyerName` for a consumer. A business keeps its legal name from the checkout snapshot. |
| Amount | `amountMinor / 100`, `currency`. When `comp` is true, show a "comp" tag: no money was taken. |
| Status | `status`, plus a "disputed" tag when `disputeOpen` is true. |
| Refund | When `status` is `REFUNDED`: `refundedAmountMinor` and `refundSource`. |

For `refundSource`:
- `WITHDRAWAL`: the host withdrew.
- `UNAPPLIED`: paid for something that couldn't be delivered, refunded in full automatically.
- `PROVIDER`: refunded in the Stripe dashboard, or a lost chargeback.

`refundedAmountMinor` can be `0`: the order was reversed but nothing was sent back. It is `null` on refunds
made before 2026-10-02.

### Suggested filters

Show a status select, a kind select, a date range and a search box first. Put the others under "More filters".
On an event's admin page, link to the list with `?eventId=`. On a user's admin page, link with `?buyerId=`.

## 2. One order

`GET /api/admin/orders/{orderId}` returns `AdminOrderDetailDto`. An unknown id gets 404.

Suggested sections, one per field of the DTO:

1. **Summary.** Same as the row.
2. **Buyer.**
   - Show name, email and type.
   - For a business, show `businessSnapshot` (legal name, VAT number, address, VIES status). These are the
     details the order was sold under, frozen at checkout. They don't follow later profile edits.
3. **Pricing.**
   - Show `checkoutLines` as the receipt the buyer saw: one row per line, `name`, `description`, amount.
   - Show `discountLabel` if any.
   - Show `taxAmountMinor` if non-null. Null means Stripe computed no tax; prices include VAT.
   - Under it, show `taxLines` when non-empty: one row per rate Stripe applied, in the order given. Show
     `ratePercent` (e.g. `24.0000` → "24%"), `country`, `taxabilityReason` and `amountMinor`.
     `taxableAmountMinor`, `jurisdiction`, `taxType` and `inclusive` can go in a tooltip or be left out.
     Only `amountMinor` is always set.
   - `taxLines` is empty when no tax was added, and briefly after payment while the breakdown is fetched.
     A non-null `taxAmountMinor` with no lines just means the breakdown isn't there; show the total alone.
   - `taxabilityReason` is Stripe's code (`standard_rated`, `reverse_charge`, `not_collecting`, ...). Show it as
     text, with a translated label for the common ones and the raw code for anything else. Don't make it an enum
     on the client: Stripe adds reasons.
   - `priceBreakdown` is the full structured breakdown, already rendered by the checkout pages. Reuse that
     component if convenient.
4. **What it bought.**
   - Show `coverage.planCode`, and `paidServiceCode` for a storage pack.
   - Show the months and the `coverageStartsAt`…`coverageEndsAt` window.
5. **Payment.**
   - Show provider ids, `billingCountry` and `cardCountry`, and the dispute dates.
   - Link `providerPaymentId` to the Stripe dashboard: `https://dashboard.stripe.com/payments/{providerPaymentId}`.
   - When `receiptUrl` is set, show a "Receipt" link that opens it in a new tab (`rel="noopener noreferrer"`).
     It's Stripe's receipt as the buyer got it, and shows later refunds. Show `receiptNumber` next to it when
     set. It can be null while `receiptUrl` is set, if Stripe hadn't emailed the receipt yet when it was fetched.
   - Both are null for a manual order, an order paid before 2026-10, or briefly after payment.
   - The receipt is proof of payment, not an invoice. Don't label it as one.
6. **Refund.** Shown only when `refund` is non-null: date, amount, source, and the Stripe refund id if any.
7. **Withdrawals.**
   - Each request that concerns the order: status, scope, reason, decision, and this order's `line` if it
     was priced.
   - Link to the existing held-withdrawal screen when `status` is `HELD`.
8. **Commission.** Partner earnings on the order. A `CLAWBACK` entry offsets an `ACCRUAL` after a refund.
9. **Consent.** The terms version and when the host asked for an immediate start.
10. **Settled by.** Shown only when an admin settled it by hand.

`cardFingerprint` and `riskLevel` are fraud signals. Show them in a collapsed "Fraud signals" block, not by
default.

## 3. What not to do

- Don't compute refund amounts or VAT on the client. Show what the server sends.
- Don't cache order pages or keep them in app state after navigating away. They hold buyers' names, emails
  and business details.
