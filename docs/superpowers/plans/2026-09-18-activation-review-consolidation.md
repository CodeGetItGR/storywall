# Activation Review Consolidation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Collapse the three-page activation flow (wizard overview step → draft `/manage` page → `/checkout/review?intent=activation`) into a single-page experience: the wizard's final step goes straight to Stripe with zero intermediate navigation, and an existing unpaid draft (whether visited directly or landed on after a Stripe cancel) shows the full review+consent+pay UI right on `/manage`.

**Architecture:** Extract the withdrawal-consent state/UI (already built once for `CheckoutReviewBoundary`) into a shared hook + component so it can be reused by the wizard's overview step and a new draft-manage review flow. Fix the wizard's checkout call, which has been missing the now-mandatory consent fields since the withdrawal migration — that's the actual root cause of the extra hops. Rebuild `OverviewDraftPanel` to do checkout inline instead of linking to `/checkout/review`. Repoint the Stripe-cancel redirect at `/manage`. Finally, delete the now-dead `activation` intent from `CheckoutReviewBoundary`, which keeps serving `upgrade`/`storage` unchanged.

**Tech Stack:** Next.js App Router, React Query, next-intl, TypeScript. No test framework changes — this codebase does not unit-test billing/checkout hooks or components (verified: `useBilling.ts`, `useEventWithdrawalFlow.ts`, `CheckoutReviewBoundary.tsx`, `useCreateEventFormController.ts` have no existing test files), so verification here is `tsc` + lint + manual browser walkthrough, matching how the immediately-preceding billing withdrawal migration in this same repo was verified.

**Design doc:** `docs/superpowers/specs/2026-09-18-activation-review-consolidation-design.md`

**Note on the design doc's component list:** The design doc named `ActivationPricingSection.tsx` as a shared piece. Closer reading of the actual code shows the wizard's pricing block (plan + discount-code rows) and the draft-manage pricing block (plan + real add-on rows) differ enough in content that forcing them into one component would need a pile of conditional props for no real gain — both already share the one thing that's genuinely identical, the `EventOverviewPriceRow` row primitive. This plan extracts only the event-summary block (`ActivationEventSummary`, byte-for-byte identical in both today) and leaves each pricing section's row list to its own caller. The consent section and hook are extracted exactly as designed.

---

### Task 1: Shared withdrawal-consent hook

**Files:**
- Create: `hooks/useWithdrawalConsent.ts`

- [ ] **Step 1: Write the hook**

```ts
'use client';

import { type ChangeEvent, useCallback, useState } from 'react';

import { useAppConfig } from '@/hooks/useAppConfig';
import { ERROR_CODES, getErrorCode } from '@/lib/api/errors';

/**
 * State and submit-time error handling for the Directive 2011/83/EU right-of-withdrawal
 * consent checkboxes. Shared by the create-event wizard, the draft-manage pay flow, and
 * CheckoutReviewBoundary's upgrade path — anywhere a checkout call requires
 * requestsImmediateStart/acknowledgesWithdrawalTerms/termsVersion.
 */
export function useWithdrawalConsent() {
    const appConfig = useAppConfig();
    const termsVersion = appConfig.data?.withdrawal.termsVersion ?? null;

    const [requestsImmediateStart, setRequestsImmediateStart] = useState(false);
    const [acknowledgesWithdrawalTerms, setAcknowledgesWithdrawalTerms] = useState(false);
    const [staleTerms, setStaleTerms] = useState(false);

    const handleRequestsImmediateStartChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
        setRequestsImmediateStart(event.target.checked);
    }, []);

    const handleAcknowledgesWithdrawalTermsChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
        setAcknowledgesWithdrawalTerms(event.target.checked);
    }, []);

    const consentSatisfied = requestsImmediateStart && acknowledgesWithdrawalTerms && Boolean(termsVersion);

    // Returns true when the error was the stale-terms case, so the caller knows not to
    // also surface a second, generic error message for the same failure.
    const handleCheckoutError = useCallback(
        (error: unknown): boolean => {
            if (getErrorCode(error) !== ERROR_CODES.WITHDRAWAL_TERMS_VERSION_STALE) return false;
            setStaleTerms(true);
            setRequestsImmediateStart(false);
            setAcknowledgesWithdrawalTerms(false);
            void appConfig.refetch();
            return true;
        },
        [appConfig]
    );

    return {
        termsVersion,
        requestsImmediateStart,
        acknowledgesWithdrawalTerms,
        staleTerms,
        consentSatisfied,
        handleRequestsImmediateStartChange,
        handleAcknowledgesWithdrawalTermsChange,
        handleCheckoutError,
    };
}

export type WithdrawalConsent = ReturnType<typeof useWithdrawalConsent>;
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no new errors (the hook isn't wired into anything yet).

- [ ] **Step 3: Commit**

```bash
git add hooks/useWithdrawalConsent.ts
git commit -m "$(cat <<'EOF'
feat(checkout): extract shared withdrawal-consent hook

Pulls the requestsImmediateStart/acknowledgesWithdrawalTerms/termsVersion
state and stale-terms handling out of CheckoutReviewBoundary so the wizard
and draft-manage flows can reuse it instead of duplicating it.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Shared withdrawal-consent section component

**Files:**
- Create: `components/checkout/WithdrawalConsentSection.tsx`

- [ ] **Step 1: Write the component**

```tsx
'use client';

import { useTranslations } from 'next-intl';
import type { ChangeEvent } from 'react';

export function WithdrawalConsentSection({
    requestsImmediateStart,
    acknowledgesWithdrawalTerms,
    staleTerms,
    onRequestsImmediateStartChangeAction,
    onAcknowledgesWithdrawalTermsChangeAction,
}: {
    requestsImmediateStart: boolean;
    acknowledgesWithdrawalTerms: boolean;
    staleTerms: boolean;
    onRequestsImmediateStartChangeAction: (event: ChangeEvent<HTMLInputElement>) => void;
    onAcknowledgesWithdrawalTermsChangeAction: (event: ChangeEvent<HTMLInputElement>) => void;
}) {
    // Canonical copy lives under CheckoutReviewPage — this is the one legal-terms
    // namespace, shared by every surface that requires this consent.
    const t = useTranslations('CheckoutReviewPage');

    return (
        <section className="rounded-lg border border-border bg-surface-muted/40 p-4" aria-labelledby="withdrawal-terms-title">
            <h2 id="withdrawal-terms-title" className="text-base font-bold text-ink">
                {t('withdrawalTerms.title')}
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-ink-muted">{t('withdrawalTerms.body')}</p>
            <label className="mt-3 flex items-start gap-2.5 text-sm">
                <input
                    type="checkbox"
                    checked={requestsImmediateStart}
                    onChange={onRequestsImmediateStartChangeAction}
                    className="mt-0.5 h-4 w-4 shrink-0 rounded border-border"
                />
                <span>
                    <span className="font-semibold text-ink">{t('withdrawalTerms.requestsImmediateStartLabel')}</span>
                    <span className="block text-xs text-ink-muted">{t('withdrawalTerms.requestsImmediateStartCaption')}</span>
                </span>
            </label>
            <label className="mt-2 flex items-start gap-2.5 text-sm">
                <input
                    type="checkbox"
                    checked={acknowledgesWithdrawalTerms}
                    onChange={onAcknowledgesWithdrawalTermsChangeAction}
                    className="mt-0.5 h-4 w-4 shrink-0 rounded border-border"
                />
                <span>
                    <span className="font-semibold text-ink">{t('withdrawalTerms.acknowledgesWithdrawalTermsLabel')}</span>
                    <span className="block text-xs text-ink-muted">{t('withdrawalTerms.acknowledgesWithdrawalTermsCaption')}</span>
                </span>
            </label>
            {staleTerms && <p className="mt-2 text-xs font-semibold text-rose-600">{t('withdrawalTerms.stale')}</p>}
        </section>
    );
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add components/checkout/WithdrawalConsentSection.tsx
git commit -m "$(cat <<'EOF'
feat(checkout): extract shared WithdrawalConsentSection component

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: Shared event-summary component

**Files:**
- Create: `components/checkout/ActivationEventSummary.tsx`

- [ ] **Step 1: Write the component**

```tsx
'use client';

import { Calendar } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';

export function ActivationEventSummary({ eventTitle, eventTypeName, startAt }: { eventTitle: string; eventTypeName: string; startAt: string | null }) {
    const t = useTranslations('CreateEventPage');
    const locale = useLocale();
    const dateFormatter = new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' });

    return (
        <section aria-labelledby="activation-event-heading" className="flex items-start gap-3">
            <Calendar className="mt-0.5 h-4 w-4 shrink-0 text-ink-faint" aria-hidden="true" />
            <div className="min-w-0">
                <h3 id="activation-event-heading" className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">
                    {t('overview.event')}
                </h3>
                <p className="mt-1 font-semibold text-ink">{eventTitle}</p>
                <p className="mt-0.5 text-sm text-ink-muted">
                    {eventTypeName}
                    {startAt && ` · ${dateFormatter.format(new Date(startAt))}`}
                </p>
            </div>
        </section>
    );
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add components/checkout/ActivationEventSummary.tsx
git commit -m "$(cat <<'EOF'
feat(checkout): extract shared ActivationEventSummary component

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: Add a `cancelled` flag to the manage route

**Files:**
- Modify: `lib/routes.ts:41-42`

- [ ] **Step 1: Extend the `manage` route helper**

Change:

```ts
        manage: (eventId: string, params: { tab?: ManageTab | null; section?: string | null } = {}) =>
            withQuery(`${eventBasePath(eventId)}/manage`, params),
```

to:

```ts
        manage: (eventId: string, params: { tab?: ManageTab | null; section?: string | null; cancelled?: boolean | null } = {}) =>
            withQuery(`${eventBasePath(eventId)}/manage`, params),
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add lib/routes.ts
git commit -m "$(cat <<'EOF'
feat(routes): allow a cancelled flag on the manage route

Needed so a Stripe cancel can redirect back to /manage with a
"payment cancelled" banner instead of the dead checkout review page.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: Wire real consent into the wizard's overview step

**Files:**
- Modify: `providers/createEvent/CreateEventFormContext.tsx:66-79`
- Modify: `hooks/useCreateEventFormController.ts`
- Modify: `components/event/create/EventOverviewStep.tsx`
- Modify: `components/event/create/EventCreateFooter.tsx:90-104`

This is the task that actually fixes the root bug: the wizard's checkout call has been missing mandatory consent fields since the withdrawal migration, which is why it always fails and falls back to a draft+redirect. Fixing this makes the happy path a true single page (wizard → Stripe, no stop at `/manage`).

- [ ] **Step 1: Add consent fields to the context type**

In `providers/createEvent/CreateEventFormContext.tsx`, replace:

```ts
    isSubmitPending: boolean;
    isEmailVerified: boolean;
}
```

with:

```ts
    // Withdrawal consent (required to submit)
    requestsImmediateStart: boolean;
    acknowledgesWithdrawalTerms: boolean;
    staleTerms: boolean;
    consentSatisfied: boolean;
    onRequestsImmediateStartChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
    onAcknowledgesWithdrawalTermsChange: (event: React.ChangeEvent<HTMLInputElement>) => void;

    isSubmitPending: boolean;
    isEmailVerified: boolean;
}
```

- [ ] **Step 2: Use the shared consent hook in the controller and fix `handleSubmit`**

In `hooks/useCreateEventFormController.ts`, add the import:

```ts
import { useWithdrawalConsent } from '@/hooks/useWithdrawalConsent';
```

Add the hook call right after the existing `useAppConfig()` line (`const { data: appConfig, refetch: refetchAppConfig } = useAppConfig();`):

```ts
    const consent = useWithdrawalConsent();
```

Replace the entire `handleSubmit` callback (currently lines 189-270) with:

```ts
    const handleSubmit = useCallback(
        async (e: React.SubmitEvent<HTMLFormElement>) => {
            e.preventDefault();
            setError(null);
            if (step === 'details') {
                if (canSubmitDetails) goToStep('overview');
                return;
            }
            if (step !== 'overview') return;
            if (!isEmailVerified || !consent.consentSatisfied) return;

            let eventId = createdDraftEventId;

            if (!eventId) {
                if (!canSubmitDetails) return;

                const input: EventRequestDto = {
                    title: trimmedTitle,
                    planTierCode: selectedCode,
                    eventType: selectedEventType,
                    visibility: 'PRIVATE',
                    startAt: new Date(startAt).toISOString(),
                    endAt: new Date(endAt).toISOString(),
                    timezone,
                    locationName: trimmedLocationName,
                    locationAddress: trimmedLocationAddress,
                    mapsUrl: mapsUrl.trim() || undefined,
                    brandingSettings: {},
                    initialSessionTitle,
                };

                try {
                    setIsCheckoutPending(true);
                    const event = await createEvent.mutateAsync(input);
                    eventId = event.id;
                    setCreatedDraftEventId(event.id);
                } catch (err) {
                    setIsCheckoutPending(false);
                    if (Object.keys(getFieldErrors(err) ?? {}).length > 0) {
                        goToStep('details');
                        return;
                    }
                    setError(toErrorMessage(err));
                    return;
                }
            }

            setIsCheckoutPending(true);
            try {
                const checkout = await api.post<CheckoutResponseDto>(endpoints.events.checkout(eventId), {
                    ...(appliedCheckoutCode ? { collaborationCode: appliedCheckoutCode } : {}),
                    requestsImmediateStart: consent.requestsImmediateStart,
                    acknowledgesWithdrawalTerms: consent.acknowledgesWithdrawalTerms,
                    termsVersion: consent.termsVersion!,
                });
                navigateToCheckout(eventId, checkout);
            } catch (checkoutError) {
                setIsCheckoutPending(false);
                if (consent.handleCheckoutError(checkoutError)) return;
                setError(toErrorMessage(checkoutError));
            }
        },
        [
            appliedCheckoutCode,
            canSubmitDetails,
            consent,
            createEvent,
            createdDraftEventId,
            goToStep,
            initialSessionTitle,
            isEmailVerified,
            mapsUrl,
            selectedCode,
            selectedEventType,
            step,
            timezone,
            toErrorMessage,
            trimmedLocationAddress,
            trimmedLocationName,
            trimmedTitle,
            startAt,
            endAt,
        ]
    );
```

Note what changed and why:
- `router` and `routes` are no longer used by this function for a "go to manage" fallback — a failed checkout now retries checkout on the *same* draft instead of bouncing to `/manage`. Remove the `router.push(routes.events.manage(...))` branch entirely; a retry now falls through to the checkout call again using the already-created `eventId`.
- The `window.history.replaceState(...)` call before `navigateToCheckout` is removed — it existed to erase evidence of a step the URL never actually left in the failing-checkout case; it's no longer needed since the URL never had anything to erase (the whole flow now stays on `/events/new?step=overview` until the Stripe redirect).
- Check whether `router` and `routes` are still used elsewhere in the file (they are — `goToStep` uses `router.push` and `routes.events.new`). Do not remove those imports.

- [ ] **Step 3: Return the new consent fields from the hook**

In the `return { ... }` object at the end of `useCreateEventFormController.ts`, add (near `isSubmitPending`/`isEmailVerified`):

```ts
        requestsImmediateStart: consent.requestsImmediateStart,
        acknowledgesWithdrawalTerms: consent.acknowledgesWithdrawalTerms,
        staleTerms: consent.staleTerms,
        consentSatisfied: consent.consentSatisfied,
        onRequestsImmediateStartChange: consent.handleRequestsImmediateStartChange,
        onAcknowledgesWithdrawalTermsChange: consent.handleAcknowledgesWithdrawalTermsChange,
```

- [ ] **Step 4: Adopt the shared event-summary component and render consent on the overview step**

In `components/event/create/EventOverviewStep.tsx`, add to the destructured `useCreateEventForm()` call:

```ts
        requestsImmediateStart,
        acknowledgesWithdrawalTerms,
        staleTerms,
        onRequestsImmediateStartChange: onRequestsImmediateStartChangeAction,
        onAcknowledgesWithdrawalTermsChange: onAcknowledgesWithdrawalTermsChangeAction,
```

Add the imports:

```ts
import { ActivationEventSummary } from '@/components/checkout/ActivationEventSummary';
import { WithdrawalConsentSection } from '@/components/checkout/WithdrawalConsentSection';
```

Replace the existing "Event Summary" section:

```tsx
            {/* Event Summary */}
            <section aria-labelledby="plan-details-heading" className="flex items-start gap-3 border-b border-border/70 pb-5">
                <Calendar className="mt-0.5 h-4 w-4 shrink-0 text-ink-faint" />

                <div className="min-w-0">
                    <h3 id="plan-details-heading" className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">
                        {t('overview.event')}
                    </h3>

                    <p className="mt-1 font-semibold text-ink">{title}</p>

                    <p className="mt-0.5 text-sm text-ink-muted">
                        {eventTypeName} · {dateFormatter.format(new Date(startAt))}
                    </p>
                </div>
            </section>
```

with:

```tsx
            {/* Event Summary */}
            <div className="border-b border-border/70 pb-5">
                <ActivationEventSummary eventTitle={title} eventTypeName={eventTypeName} startAt={startAt} />
            </div>
```

The `Calendar` import and the local `dateFormatter` constant become unused once this section is removed — check the rest of the file (the "Pricing"/"Checkout code" sections don't reference either) and delete both: the `import { Calendar, Loader2, Receipt } from 'lucide-react';` line becomes `import { Loader2, Receipt } from 'lucide-react';`, and the `const dateFormatter = new Intl.DateTimeFormat(...)` line is removed. `eventTypeName` itself is still used (now as a prop to `ActivationEventSummary` instead of inline), so keep the `matchedEventType`/`eventTypeName` computation as-is.

Insert a new section after the "Checkout code" `</section>` and before the "Error State" block:

```tsx
            {/* Withdrawal consent */}
            <section aria-labelledby="withdrawal-terms-title" className="border-t border-border/70 pt-5">
                <WithdrawalConsentSection
                    requestsImmediateStart={requestsImmediateStart}
                    acknowledgesWithdrawalTerms={acknowledgesWithdrawalTerms}
                    staleTerms={staleTerms}
                    onRequestsImmediateStartChangeAction={onRequestsImmediateStartChangeAction}
                    onAcknowledgesWithdrawalTermsChangeAction={onAcknowledgesWithdrawalTermsChangeAction}
                />
            </section>
```

(`WithdrawalConsentSection` already renders its own bordered card — the wrapping `<section>` here only adds the top divider/spacing consistent with the other sections on this step, not a second border.)

- [ ] **Step 5: Gate the footer submit button on consent**

In `components/event/create/EventCreateFooter.tsx`, add `consentSatisfied` to the destructured `useCreateEventForm()` call, and change the overview step's submit button:

```tsx
                        <button
                            form={formId}
                            type="submit"
                            disabled={isSubmitPending || !isEmailVerified || !consentSatisfied}
                            className="flex min-h-11 flex-2 items-center justify-center gap-2 rounded-full bg-gradient-brand text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
                        >
                            {isSubmitPending ? <Loader2 className="h-4 w-4 animate-spin" /> : t('submitAndPay')}
                        </button>
```

(The `hasDraft ? t('paidModules.openSetup') : t('submitAndPay')` branch is removed — a draft that failed checkout once now just retries the same "Pay now" action instead of switching to "open setup," since it never leaves this page.)

- [ ] **Step 6: Remove the now-unused `hasDraft` plumbing if nothing else reads it**

Run: `grep -rn "hasDraft" --include="*.tsx" --include="*.ts" components hooks providers app`

If `hasDraft` (and the `createdDraftEventId`-derived value it comes from) is only read by the footer branch just removed, delete the `hasDraft` field from `CreateEventFormContext.tsx`'s type and from the `useCreateEventFormController.ts` return object. If `EventOverviewStep.tsx`'s error block (`{hasDraft && <p>...}`) still uses it, leave that one usage in place and only drop it from the footer.

- [ ] **Step 7: Type-check and lint**

Run: `npx tsc --noEmit && npx eslint hooks/useCreateEventFormController.ts components/event/create/EventOverviewStep.tsx components/event/create/EventCreateFooter.tsx providers/createEvent/CreateEventFormContext.tsx`
Expected: no errors.

- [ ] **Step 8: Manual verification**

Run the dev server, go through the wizard end-to-end for a brand-new event: type → plan → details → overview. On the overview step, confirm both consent checkboxes are required for the submit button to enable, and confirm submitting redirects straight to Stripe with **no** intermediate stop at `/manage`.

- [ ] **Step 9: Commit**

```bash
git add providers/createEvent/CreateEventFormContext.tsx hooks/useCreateEventFormController.ts components/event/create/EventOverviewStep.tsx components/event/create/EventCreateFooter.tsx
git commit -m "$(cat <<'EOF'
fix(checkout): send withdrawal consent from the wizard's checkout call

The wizard's overview step already tried to go straight from draft
creation to Stripe on one page, but never sent requestsImmediateStart/
acknowledgesWithdrawalTerms/termsVersion, which checkout has required
since the withdrawal migration — so it always failed and fell back to
a draft + redirect to /manage. Adding the consent UI here and retrying
checkout on the same draft (instead of bouncing to /manage) makes the
happy path a true single page.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 6: Draft-manage checkout hook

**Files:**
- Create: `hooks/useDraftActivationCheckout.ts`

- [ ] **Step 1: Write the hook**

```ts
'use client';

import { useCallback, useState } from 'react';

import { useApiErrorMessage } from '@/hooks/useApiErrorMessage';
import { useCheckout } from '@/hooks/useBilling';
import { useWithdrawalConsent } from '@/hooks/useWithdrawalConsent';
import type { CollaborationCodePreviewResponseDto } from '@/lib/api/types';
import { navigateToCheckout } from '@/lib/billing';

/**
 * Checkout + consent for an already-created DRAFT event's /manage page —
 * the "come back later and pay" and "returned from a cancelled Stripe
 * session" entry points. Mirrors the wizard's own checkout call.
 */
export function useDraftActivationCheckout(eventId: string) {
    const checkout = useCheckout(eventId);
    const consent = useWithdrawalConsent();
    const toErrorMessage = useApiErrorMessage();
    const [collaborationCode, setCollaborationCode] = useState<string | null>(null);
    const [collaborationPreview, setCollaborationPreview] = useState<CollaborationCodePreviewResponseDto | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleCollaborationPreviewChange = useCallback((nextCode: string | null, nextPreview: CollaborationCodePreviewResponseDto | null) => {
        setCollaborationCode(nextCode);
        setCollaborationPreview(nextPreview);
    }, []);

    const submit = useCallback(async () => {
        if (!consent.consentSatisfied || !consent.termsVersion) return;
        setError(null);
        try {
            const response = await checkout.mutateAsync({
                ...(collaborationCode ? { collaborationCode } : {}),
                requestsImmediateStart: consent.requestsImmediateStart,
                acknowledgesWithdrawalTerms: consent.acknowledgesWithdrawalTerms,
                termsVersion: consent.termsVersion,
            });
            navigateToCheckout(eventId, response);
        } catch (checkoutError) {
            if (consent.handleCheckoutError(checkoutError)) return;
            setError(toErrorMessage(checkoutError));
        }
    }, [checkout, collaborationCode, consent, eventId, toErrorMessage]);

    return {
        consent,
        collaborationPreview,
        handleCollaborationPreviewChange,
        submit,
        error,
        isPending: checkout.isPending,
    };
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add hooks/useDraftActivationCheckout.ts
git commit -m "$(cat <<'EOF'
feat(checkout): add useDraftActivationCheckout for the draft-manage page

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 7: Rebuild `OverviewDraftPanel` as the full review UI

**Files:**
- Modify: `components/manage/OverviewDraftPanel.tsx`
- Modify: `app/(app)/(event)/events/[eventId]/manage/OverviewTab.tsx`
- Modify: `components/manage/ManageScreen.tsx`

This replaces the summary-plus-link with the full inline review: event summary, pricing, collaboration code, consent, and a pay button that calls checkout directly. It also handles the "returned from a cancelled Stripe session" banner.

- [ ] **Step 1: Thread the `cancelled` flag down from `ManageScreen.tsx`**

In `components/manage/ManageScreen.tsx`, next to the existing `const requestedSection = parseManageSection(searchParams.get('tab'));` line, add:

```ts
    const cancelledCheckout = searchParams.get('cancelled') === 'true';
```

Pass it to `OverviewTab`:

```tsx
                    <OverviewTab
                        memberCount={members.length}
                        daysToGo={daysToGo}
                        invitationCount={invitations.length}
                        seatsClaimed={seatsClaimed}
                        eventUsage={eventUsage}
                        planTiers={appConfig?.planTiers ?? []}
                        paidServices={appConfig?.paidServices ?? []}
                        modules={appConfig?.modules ?? []}
                        eventModules={activeEvent.modules}
                        eventId={activeEvent.id}
                        eventTitle={activeEvent.title}
                        eventType={activeEvent.eventType}
                        eventStatus={activeEvent.status}
                        startAt={activeEvent.startAt}
                        cancelledCheckout={cancelledCheckout}
                    />
```

(Keep whatever prop is already there for `startAt` — add only `cancelledCheckout` as a new prop.)

- [ ] **Step 2: Accept and forward the flag in `OverviewTab.tsx`**

Add `cancelledCheckout: boolean` to the props type, and pass it through to `OverviewDraftPanel`:

```tsx
export default function OverviewTab({
    memberCount,
    daysToGo,
    invitationCount,
    seatsClaimed,
    eventUsage,
    planTiers,
    paidServices,
    modules,
    eventModules,
    eventId,
    eventTitle,
    eventType,
    eventStatus,
    startAt,
    cancelledCheckout,
}: {
    memberCount: number;
    daysToGo: number;
    invitationCount: number;
    seatsClaimed: number;
    eventUsage: EventUsageResponseDto | null;
    planTiers: PlanTierResponseDto[];
    paidServices: PaidServiceResponseDto[];
    modules: PlatformModuleResponseDto[];
    eventModules: EventModuleResponseDto[];
    eventId: string;
    eventTitle: string;
    eventType: EventTypeConvention;
    eventStatus: EventStatus;
    startAt: string | null;
    cancelledCheckout: boolean;
}) {
```

And in the `DRAFT` branch:

```tsx
    if (eventStatus === 'DRAFT') {
        return (
            <OverviewDraftPanel
                eventId={eventId}
                eventTitle={eventTitle}
                eventType={eventType}
                startAt={startAt}
                currentPlan={currentPlan}
                currency={currentPlan?.priceCurrency ?? 'EUR'}
                selectedAddons={selectedAddons}
                activationTotal={currentPlan?.priceCurrency ? activationTotal : null}
                wishlistAvailable={wishlistAvailable}
                cancelledCheckout={cancelledCheckout}
            />
        );
    }
```

- [ ] **Step 3: Rewrite `OverviewDraftPanel.tsx`**

Replace the full file with:

```tsx
'use client';

import { AlertTriangle, Clock3, Loader2, LockKeyhole, Receipt } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';

import { ActivationEventSummary } from '@/components/checkout/ActivationEventSummary';
import { CollaborationCodeSection } from '@/components/checkout/CollaborationCodeSection';
import { WithdrawalConsentSection } from '@/components/checkout/WithdrawalConsentSection';
import { EventOverviewPriceRow } from '@/components/event/create/EventOverviewPriceRow';
import { GiftAccountSetup } from '@/components/manage/GiftAccountSetup';
import { TargetedSection } from '@/components/manage/TargetedSection';
import { useDraftActivationCheckout } from '@/hooks/useDraftActivationCheckout';
import { useLocalizedAppEventTypeCopy } from '@/hooks/useLocalizedAppEventTypeCopy';
import type { EventBillingResponseDto, EventTypeConvention, PlanTierResponseDto } from '@/lib/api/types';
import { formatMoney } from '@/lib/billing';
import { GIFT_ACCOUNT_SECTION_ID } from '@/lib/manageSectionTargets';
import { getPlanPriceDetails } from '@/lib/planTiers';

export function OverviewDraftPanel({
    eventId,
    eventTitle,
    eventType,
    startAt,
    currentPlan,
    currency,
    selectedAddons,
    activationTotal,
    wishlistAvailable,
    cancelledCheckout,
}: {
    eventId: string;
    eventTitle: string;
    eventType: EventTypeConvention;
    startAt: string | null;
    currentPlan: PlanTierResponseDto | undefined;
    currency: string;
    selectedAddons: EventBillingResponseDto['addons'];
    activationTotal: number | null;
    wishlistAvailable: boolean;
    cancelledCheckout: boolean;
}) {
    const t = useTranslations('ManagePage');
    const tCreate = useTranslations('CreateEventPage');
    const tCheckoutReview = useTranslations('CheckoutReviewPage');
    const locale = useLocale();
    const eventTypeCopy = useLocalizedAppEventTypeCopy();
    const canPay = Boolean(startAt);
    const planActivation = currentPlan ? getPlanPriceDetails(currentPlan) : null;

    const { consent, collaborationPreview, handleCollaborationPreviewChange, submit, error, isPending } = useDraftActivationCheckout(eventId);

    // activationTotal already bundles the plan's own (non-collaboration-code) price with
    // whichever add-ons count toward activation (see useEventOverviewPlan). A collaboration
    // code only discounts the plan portion, so swap that portion out rather than replacing
    // the whole total — this keeps add-on charges intact when a code is applied.
    const dueNowMinor =
        collaborationPreview && activationTotal !== null && planActivation
            ? activationTotal - planActivation.amountMinor + collaborationPreview.payableAmountMinor
            : activationTotal;
    const dueNowCurrency = collaborationPreview?.currency ?? currency;
    const dueNowTotalLabel = dueNowMinor !== null ? formatMoney(locale, dueNowMinor, dueNowCurrency) : tCreate('payment.noCharge');

    return (
        <div className="flex flex-col gap-6 lg:grid lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start lg:gap-8">
            {/* Left: event, pricing, collaboration code, consent */}
            <div className="flex flex-col gap-5">
                {/* Status */}
                <div className="flex items-start gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <Clock3 className="h-4.5 w-4.5" aria-hidden="true" />
                    </span>
                    <div className="min-w-0">
                        <p className="text-sm font-bold text-ink">{t('draft.title')}</p>
                        <p className="mt-1 text-xs leading-relaxed text-ink-muted">{canPay ? t('draft.bodyReadyToPay') : t('draft.body')}</p>
                    </div>
                </div>

                {/* Cancelled payment notice */}
                {cancelledCheckout && (
                    <div className="flex items-start gap-3 rounded-lg bg-amber-50 p-4">
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-hidden="true" />
                        <div className="min-w-0 text-sm">
                            <p className="font-semibold text-ink">{tCheckoutReview('intent.activationCancelled.title')}</p>
                            <p className="mt-1 text-ink-muted">{tCheckoutReview('intent.activationCancelled.description')}</p>
                        </div>
                    </div>
                )}

                {/* Event summary */}
                <div className="border-t border-border/70 pt-5">
                    <ActivationEventSummary eventTitle={eventTitle} eventTypeName={eventTypeCopy(eventType).name} startAt={startAt} />
                </div>

                {/* Pricing */}
                <section aria-labelledby="draft-pricing-heading" className="border-t border-border/70 pt-5">
                    <div className="flex items-center gap-1.5">
                        <Receipt className="h-3.5 w-3.5 text-ink-faint" aria-hidden="true" />
                        <h3 id="draft-pricing-heading" className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">
                            {tCreate('overview.pricing')}
                        </h3>
                    </div>
                    <p className="mt-1 text-xs text-ink-muted">{tCreate('overview.pricingHint')}</p>

                    <div className="mt-3 divide-y divide-border/70">
                        {currentPlan && (
                            <EventOverviewPriceRow
                                label={currentPlan.name}
                                detail={tCreate('overview.planActivation')}
                                amount={planActivation && formatMoney(locale, planActivation.amountMinor, planActivation.currency)}
                                fallback={tCreate('payment.noCharge')}
                            />
                        )}
                        {selectedAddons.map((addon, index) => (
                            <EventOverviewPriceRow
                                key={`${addon.code}-${index}`}
                                label={addon.name}
                                detail={t('draftModules.once')}
                                amount={formatMoney(locale, addon.priceAmountMinor, currency)}
                                fallback={tCreate('payment.noCharge')}
                            />
                        ))}
                        {collaborationPreview && planActivation && (
                            <EventOverviewPriceRow
                                label={tCreate('overview.discount')}
                                detail={tCreate('overview.discountDetail', {
                                    label: collaborationPreview.label,
                                    percent: collaborationPreview.combinedDiscountPercent,
                                })}
                                amount={`-${formatMoney(locale, planActivation.amountMinor - collaborationPreview.payableAmountMinor, collaborationPreview.currency)}`}
                                fallback={tCreate('payment.noCharge')}
                                amountClassName="text-emerald-700"
                            />
                        )}
                    </div>
                </section>

                {/* Collaboration code */}
                {canPay && <CollaborationCodeSection eventId={eventId} onPreviewChangeAction={handleCollaborationPreviewChange} />}

                {/* Withdrawal consent */}
                {canPay && (
                    <WithdrawalConsentSection
                        requestsImmediateStart={consent.requestsImmediateStart}
                        acknowledgesWithdrawalTerms={consent.acknowledgesWithdrawalTerms}
                        staleTerms={consent.staleTerms}
                        onRequestsImmediateStartChangeAction={consent.handleRequestsImmediateStartChange}
                        onAcknowledgesWithdrawalTermsChangeAction={consent.handleAcknowledgesWithdrawalTermsChange}
                    />
                )}

                {/* Gift account */}
                {wishlistAvailable && (
                    <TargetedSection id={GIFT_ACCOUNT_SECTION_ID} className="border-t border-border/70 pt-5">
                        <GiftAccountSetup eventId={eventId} className="" />
                    </TargetedSection>
                )}
            </div>

            {/* Right: payment action */}
            <div className="rounded-2xl border border-border bg-surface-muted/40 p-5 lg:sticky lg:top-24">
                <p className="text-xs font-semibold uppercase tracking-wide text-ink-faint">{tCreate('overview.dueNow')}</p>
                <p className="mt-1 text-2xl font-bold text-primary-dark">{dueNowTotalLabel}</p>

                {error && <p className="mt-3 text-sm text-rose-600">{error}</p>}

                <div className="mt-4">
                    {canPay ? (
                        <button
                            type="button"
                            onClick={submit}
                            disabled={isPending || !consent.consentSatisfied}
                            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-ink px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
                        >
                            {isPending ? (
                                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                            ) : (
                                <LockKeyhole className="h-4 w-4" aria-hidden="true" />
                            )}
                            {isPending ? t('draft.openingCheckout') : t('draft.payAndPublish')}
                        </button>
                    ) : (
                        <button
                            type="button"
                            disabled
                            className="inline-flex min-h-11 w-full items-center justify-center rounded-full bg-ink px-4 text-sm font-semibold text-white opacity-40"
                        >
                            {t('draft.addStartDate')}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
```

(The `Link` import and `routes` import are dropped — this panel no longer links anywhere for payment, it does it inline. Fix the duplicate `useLocale` import — there are two `next-intl` import lines in the snippet above only because of how it's presented here; combine them into a single `import { useLocale, useTranslations } from 'next-intl';` line in the actual file.)

- [ ] **Step 4: Type-check and lint**

Run: `npx tsc --noEmit && npx eslint components/manage/OverviewDraftPanel.tsx app/\(app\)/\(event\)/events/\[eventId\]/manage/OverviewTab.tsx components/manage/ManageScreen.tsx`
Expected: no errors. Fix the combined `next-intl` import if the linter flags duplicate imports.

- [ ] **Step 5: Manual verification**

Using an existing unpaid seed draft (e.g. "Housewarming (draft)"), open `/events/{id}/manage` directly and confirm the full review UI renders with real data, the pay button is disabled until both consent boxes are checked, and submitting redirects to Stripe.

- [ ] **Step 6: Commit**

```bash
git add components/manage/OverviewDraftPanel.tsx "app/(app)/(event)/events/[eventId]/manage/OverviewTab.tsx" components/manage/ManageScreen.tsx
git commit -m "$(cat <<'EOF'
feat(checkout): make the draft manage page do activation checkout inline

Replaces the summary-plus-link-to-checkout-review UI with the full
review (summary, pricing, collaboration code, consent, pay button)
directly on /manage, for hosts returning to pay for an existing draft
or landing back here after cancelling on Stripe.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 8: Repoint the Stripe-cancel redirect

**Files:**
- Modify: `app/(app)/(event)/events/[eventId]/checkout/cancelled/page.tsx`

- [ ] **Step 1: Change the redirect target**

Replace the file's contents:

```tsx
'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { clearPendingCheckout } from '@/lib/billing';
import { routes } from '@/lib/routes';

export default function CheckoutCancelledPage() {
    const { eventId } = useParams<{ eventId: string }>();
    const router = useRouter();

    useEffect(() => {
        clearPendingCheckout(eventId);
        router.replace(routes.events.manage(eventId, { tab: 'overview', cancelled: true }));
    }, [eventId, router]);

    return null;
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 3: Manual verification**

Start activation checkout for a draft event, cancel on Stripe's hosted page, and confirm you land on `/events/{id}/manage` with the "payment cancelled" banner, the same event data, and a working pay button (not the wizard, not a 404, not the old checkout-review page).

- [ ] **Step 4: Commit**

```bash
git add "app/(app)/(event)/events/[eventId]/checkout/cancelled/page.tsx"
git commit -m "$(cat <<'EOF'
fix(checkout): send a cancelled activation checkout back to /manage

/checkout/review?intent=activation is going away; /manage now shows
the full review UI for a DRAFT event, so cancelling and returning
lands there instead, with a cancelled-payment banner.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 9: Cut over `CheckoutReviewBoundary` — drop `activation`, adopt shared pieces for `upgrade`

**Files:**
- Modify: `app/(app)/(event)/events/[eventId]/checkout/review/CheckoutReviewBoundary.tsx`
- Modify: `lib/routes.ts:5`
- Modify: `messages/en.json`, `messages/el.json`

Only run this task after Tasks 5–8 are verified working — this is the point where the old activation path stops existing at all.

- [ ] **Step 1: Confirm nothing else links to activation intent**

Run: `grep -rn "checkoutReview(.*'activation'" --include="*.ts" --include="*.tsx" app components hooks lib providers`

Expected: no matches (Task 8 removed the last one).

- [ ] **Step 2: Narrow the `CheckoutIntent` type**

In `lib/routes.ts:5`, change:

```ts
export type CheckoutIntent = 'activation' | 'upgrade' | 'storage';
```

to:

```ts
export type CheckoutIntent = 'upgrade' | 'storage';
```

- [ ] **Step 3: Remove the `activation` branch from `CheckoutReviewBoundary.tsx`**

- Remove `'activation'` from the `CHECKOUT_INTENTS` array.
- Remove `activationCheckout` (`useCheckout`) — it's only used by the deleted branch; if `useCheckout` has no other caller in this file, drop the import too. (`useDraftActivationCheckout` now owns that call for the draft-manage page.)
- Remove the `intent === 'activation'` branch of the `if (intent === 'activation') { ... } else if (intent === 'upgrade') { ... } else { ... }` block — the `if` becomes `if (intent === 'upgrade') { ... } else { ... /* storage */ }`.
- Remove the `isCancelledActivation` variable and the `activationCancelled` fallback values (`title`/`description`/`consequence` default to the storage-branch shape, matching the pre-existing `else` initialization pattern already in the file — i.e. drop the `activationCancelled`-specific defaults and initialize `title`/`description`/`consequence` from whichever of `upgrade`/`storage` applies).
- Remove the `<CollaborationCodeSection eventId={eventId} ... />` line that was gated on `intent === 'activation'` (upgrade/storage never used it).
- Replace the inline withdrawal-consent `<section>` block with `<WithdrawalConsentSection requestsImmediateStart={requestsImmediateStart} acknowledgesWithdrawalTerms={acknowledgesWithdrawalTerms} staleTerms={staleTerms} onRequestsImmediateStartChangeAction={handleRequestsImmediateStartChange} onAcknowledgesWithdrawalTermsChangeAction={handleAcknowledgesWithdrawalTermsChange} />`, keeping the existing local `useState` calls for these three values as they are today (adopting the full `useWithdrawalConsent` hook here is optional polish, not required — the goal of this step is just to stop duplicating the checkbox markup; leave the existing state/handlers in this file untouched since `upgrade`'s behavior must not change).
- `backHref`'s `intent === 'activation'` branch is removed; only the `storage` and `upgrade` (now the `else`) cases remain.
- `requiresConsent` becomes `true` unconditionally (only `upgrade`/`storage` remain, and `storage` never rendered the consent section before either — check: today `requiresConsent = intent === 'activation' || intent === 'upgrade'`; after removing `activation`, this becomes `requiresConsent = intent === 'upgrade'`, which is correct and requires no further change beyond deleting the `'activation' ||` clause).

- [ ] **Step 4: Remove now-dead translation keys**

In both `messages/en.json` and `messages/el.json`, under `CheckoutReviewPage.intent`, remove the `activation` and `activationCancelled` keys — confirm first that `OverviewDraftPanel.tsx` (Task 7) still needs `intent.activationCancelled.title`/`.description`. It does, so **keep** `activationCancelled`; only remove `intent.activation` (the non-cancelled activation copy), since nothing reads that one anymore once the wizard and draft-manage panel use their own `ManagePage`/`CreateEventPage` copy instead.

- [ ] **Step 5: Type-check and lint**

Run: `npx tsc --noEmit && npx eslint "app/(app)/(event)/events/[eventId]/checkout/review/CheckoutReviewBoundary.tsx" lib/routes.ts`
Expected: no errors. A leftover reference to the removed `activation` branch, `isCancelledActivation`, or the narrowed `CheckoutIntent` type will surface here.

- [ ] **Step 6: Manual verification**

Trigger an upgrade checkout from an active event's billing tab and confirm the review page still renders and behaves exactly as before (same copy, same consent requirement, same Stripe redirect). Trigger a storage-pack purchase and confirm it's unaffected.

- [ ] **Step 7: Commit**

```bash
git add "app/(app)/(event)/events/[eventId]/checkout/review/CheckoutReviewBoundary.tsx" lib/routes.ts messages/en.json messages/el.json
git commit -m "$(cat <<'EOF'
refactor(checkout): drop the dead activation intent from CheckoutReviewBoundary

Activation checkout now happens on the wizard's overview step or the
draft manage page; nothing links to intent=activation any more. This
route keeps serving upgrade/storage unchanged, now sharing the
WithdrawalConsentSection component instead of duplicating its markup.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 10: Full verification pass

**Files:** none (verification only)

- [ ] **Step 1: Full type-check and lint**

Run: `npx tsc --noEmit`
Run: `npx eslint .`
Expected: clean.

- [ ] **Step 2: Run the existing test suite**

Run: `npx vitest run`
Expected: same baseline as before this work (`hooks/useStoryFilterSwipe.test.ts` is a known pre-existing failure unrelated to this change; no new failures).

- [ ] **Step 3: Browser walkthrough**

1. Fresh event creation end-to-end (type → plan → details → overview → Stripe), confirm zero intermediate pages.
2. Cancel from Stripe, confirm landing on `/manage` with the cancelled banner, identical event data, and a working retry.
3. Complete payment on retry, confirm the event goes `ACTIVE` and `/manage` switches to the normal (non-draft) overview.
4. Open an existing unpaid seed draft directly at `/manage` (no cancel flag), confirm the full review renders without the cancelled banner.
5. Check 375px and desktop breakpoints on the draft-manage panel for overlap/cramped text.
6. Confirm an upgrade checkout (from an active event) and a storage-pack purchase still work unchanged.

- [ ] **Step 4: Search for stale references**

Run: `grep -rniE "intent.*activation|activation.*intent" --include="*.ts" --include="*.tsx" app components hooks lib`

Confirm any remaining hits are expected (e.g. `activationTotal`, `activationCancelled` retained on purpose) and not leftover dead code.

- [ ] **Step 5: Report to the user**

Summarize what changed, confirm all manual verification steps passed, and hand off using the finishing-a-development-branch skill.
