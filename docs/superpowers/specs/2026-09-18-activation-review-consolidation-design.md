# Activation review consolidation — design

## Problem

Activating a new event today spans three separate pages: the wizard's `overview` step, the draft event's `/manage` overview tab, and `/checkout/review?intent=activation`. This isn't an intentional three-step flow — it's a bug. The wizard's final step already tries to create the draft and go straight to checkout on one page ([hooks/useCreateEventFormController.ts:236-241](../../../hooks/useCreateEventFormController.ts)), but it never sends `requestsImmediateStart` / `acknowledgesWithdrawalTerms` / `termsVersion`, which the withdrawal migration made mandatory on `CheckoutRequestDto`. That call always fails validation, falls into the catch branch, and redirects to `/manage`, which only shows a summary and a link to the real review/consent page. Hosts pay a two-hop tax to do something that was designed to take zero hops.

## Scope

- Applies to **activation** checkout only. `upgrade` and `storage` intents on `CheckoutReviewBoundary` are untouched — same UI, same copy, same behavior.
- Applies only to what happens **after** the wizard's `details` step. The `type` / `plan` / `details` steps are unchanged.
- The withdrawal-consent checkboxes (Directive 2011/83/EU right-of-withdrawal acknowledgment) remain **required** — just relocated onto the consolidated surfaces instead of a separate page.
- Covers three real entry points that must all keep working:
  1. Finishing the wizard for a brand-new event (happy path).
  2. Returning later to an already-created, unpaid draft (e.g. seed data like "Housewarming (draft)") to pay.
  3. Canceling payment on Stripe's hosted page and being sent back.

## Architecture

**Wizard (`/events/new?step=overview`):** No structural change. `handleSubmit` still creates the draft, then calls checkout, then does a hard redirect to Stripe via `navigateToCheckout`. The fix is that the checkout call now sends real consent fields, gated by two checkboxes rendered on this same step — so the happy path never leaves this page before the Stripe redirect.

**Existing draft, "come back and pay" (`/events/{id}/manage`, `eventStatus === 'DRAFT'`):** `OverviewTab` already branches to a draft-specific panel here. That panel is upgraded from a summary + external link into the full review UI (event summary, pricing, collaboration code, consent, pay button), backed by real server data (`useEventBilling`, `useEvent`, `useAppConfig`) instead of wizard form state. Submitting calls the same `useCheckout(eventId)` mutation and redirects to Stripe the same way the wizard does.

**Cancel-and-return:** `navigateToCheckout` is a full `window.location.assign()` to an external Stripe domain — no client-side state survives that round trip, by construction, in the current code or this redesign. What survives is the draft event itself, already persisted server-side before the redirect happened. `/checkout/cancelled` is updated to redirect to `routes.events.manage(eventId)` instead of the now-dead `checkoutReview(eventId, 'activation', ...)`. Because `/manage` refetches by `eventId` from the server, the host lands back on the exact event they configured — same title, dates, plan, price, add-ons — with the two consent checkboxes unchecked again (expected: it's a per-payment-attempt acknowledgment, not saved data), not bounced back to wizard step one.

**Dead code:** `/checkout/review?intent=activation` becomes unreachable once nothing links to it with that intent. The `activation` branch inside `CheckoutReviewBoundary` is removed; `upgrade`/`storage` stay as they are today.

## Components

New shared, presentational (no data-fetching) pieces under `components/checkout/`:

- `ActivationSummarySection.tsx` — event title/type/date block. Replaces the near-duplicate JSX currently in both `EventOverviewStep.tsx` and `OverviewDraftPanel.tsx`.
- `ActivationPricingSection.tsx` — plan/add-on line items + due-now total. Same duplication today, one component going forward.
- `WithdrawalConsentSection.tsx` — the two checkboxes, their copy, and the stale-terms message. Currently lives only inside `CheckoutReviewBoundary`; becomes shared across all three consent-requiring surfaces (wizard, draft-manage, and `CheckoutReviewBoundary`'s remaining `upgrade` path).

New hook:

- `hooks/useWithdrawalConsent.ts` — owns `requestsImmediateStart` / `acknowledgesWithdrawalTerms` / `staleTerms` state, the derived `consentSatisfied` boolean, and the `WITHDRAWAL_TERMS_VERSION_STALE` error branch (reset checkboxes, refetch app config, surface the stale message). Consumed by the wizard controller, a new `useDraftActivationCheckout(eventId)` hook for the draft-manage entry point, and `CheckoutReviewBoundary`'s `upgrade` path (internal refactor only — upgrade's visible behavior and copy do not change).

**Explicitly not merged:** the wizard's collaboration-code widget (`usePreviewCreateEventCode`, pre-event, scoped by `eventType` + `planTierCode`) and `CollaborationCodeSection` (`usePreviewCollaborationCode(eventId)`, scoped by an existing event) are different endpoints for different lifecycle stages — no event exists yet at the wizard's overview step. The wizard keeps its own widget; `OverviewDraftPanel` adopts `CollaborationCodeSection` since a real event already exists there. Forcing these into one component would require creating the draft earlier than today (on entering the step rather than on submit), which is a bigger behavioral change than this task calls for and is out of scope.

### Modified files

- `EventOverviewStep.tsx` / `useCreateEventFormController.ts` — add `WithdrawalConsentSection` + real consent payload to the checkout call.
- `OverviewDraftPanel.tsx` — replace the summary-plus-link with the full review UI (shared sections + `CollaborationCodeSection` + a submit button that calls checkout directly).
- `app/(app)/(event)/events/[eventId]/checkout/cancelled/page.tsx` — redirect target changes to `routes.events.manage(eventId)`.
- `CheckoutReviewBoundary.tsx` — drop the `activation` branch; `upgrade`/`storage` adopt the shared consent hook/section internally with no visible change.

## Error handling

- Checkout call fails for a real reason (network, 5xx) at either entry point: inline error, stay on the same page, retry — same as today.
- `WITHDRAWAL_TERMS_VERSION_STALE`: reset checkboxes, refetch app config, show the existing stale-terms message — same behavior, now shared logic via `useWithdrawalConsent`.
- Stripe cancel: lands on `/manage`, a full server refetch — nothing to lose.

## Out of scope

- `upgrade` and `storage` checkout intents/UI/copy.
- The wizard's `type` / `plan` / `details` steps.
- The checkout success flow (`/checkout/success`).
- Changing when the draft event is created (stays "on final submit," not "on reaching the step").

## Testing / verification

Manual browser pass (host-facing UI, mobile-first per project convention):

1. Create a fresh event end-to-end — confirm zero intermediate pages before the Stripe redirect.
2. Cancel from Stripe, confirm landing on `/manage` with the exact same event data intact and a working pay button.
3. Open an existing unpaid seed draft (e.g. "Housewarming (draft)") directly at `/manage`, confirm the same consolidated review UI renders from server data.
4. Check both 375px (mobile) and desktop breakpoints for the consolidated draft-manage panel.
5. `npx tsc --noEmit` and lint clean; confirm no remaining references to `checkoutReview(eventId, 'activation', ...)`.
