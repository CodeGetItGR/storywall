# Billing Withdrawal Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the admin-approved "refund request" flow (host requests → admin approves/rejects) with the backend's new automated "withdrawal" flow (host asks → server computes and either refunds immediately or holds for fraud review), across types, endpoints, checkout consent, host UI, admin UI, notifications, and error handling — per `docs/integration guides/billing-fe-guide.md` §6, §7d, §9, §10, §12.

**Architecture:** Additive-then-cutover per layer. Each task adds the new withdrawal surface (types → endpoints → hooks → UI) while the old refund surface still compiles and runs, so the app never sits in a broken intermediate state. The final cleanup task deletes every dead refund type/endpoint/hook/component/translation in one pass, once nothing references them.

**Deviation from the standard TDD step template:** this codebase does not unit-test this layer today — there are no tests for `useBilling.ts`, `useAdmin.ts`, `useEventRefundFlow.ts`, `BillingRefundPanel.tsx`, `RefundQueuePanel.tsx`, or `RefundRow.tsx` (confirmed by search: only genuinely tricky async/retry/security logic — `useEventFeedStream`, `lib/api/client.ts`'s reactive refresh, `proxy.ts`, the session route — has tests). Per `writing-plans`' own "follow established patterns" rule, tasks below use **implement → `tsc`/`eslint` → commit** instead of fabricating tests for straightforward CRUD wiring and presentational components. The final task adds a manual browser verification pass per this repo's CLAUDE.md UI-change rule.

**Tech Stack:** Next.js App Router, TanStack Query, next-intl (`messages/en.json` + `messages/el.json`), Tailwind, lucide-react icons.

**Key decisions locked in with the user before this plan was written:**
- Consent copy (terms text shown before checkout) is **placeholder** pending real legal/product copy — clearly marked in code comments and translation keys so it's easy to find and swap later.
- "Pay and Publish" in `OverviewDraftPanel` will **route through `CheckoutReviewBoundary`** (the existing review page) instead of calling checkout directly, so there is one consistent place to show the new consent UI for both activation and upgrade. (Storage checkout already routes through the review page and needs no consent fields.)

---

## File Map

| File | Change |
|---|---|
| `lib/api/types.ts` | Add `WithdrawalConsentDto`, `WithdrawalStatus`, `OrderKind`, `RefundBasis`, `WithdrawalRefusal`, `WithdrawalLine`, `WithdrawalPreviewResponseDto`, `WithdrawalResponseDto`, `WithdrawalRequestDto`, `WithdrawalFraudSignalDto`, `WithdrawalAdminDto`, `WithdrawalWithholdRequestDto`, `AppWithdrawalConfigDto`; extend `OrderSummaryDto`, `AppConfigResponseDto`, `CheckoutRequestDto`, `UpgradeCheckoutRequestDto`, `BillingNotificationType`; delete `RefundRequestStatus`, `RefundEligibilityResponseDto`, `RefundRequestResponseDto`, `RefundRequestAdminDto`, `RefundDecisionRequestDto` (Task 10) |
| `lib/api/endpoints.ts` | Add `events.withdrawalPreview`, `events.withdrawals`, `admin.withdrawals.*`; delete `events.refundEligibility`, `events.refundRequests`, `admin.refundRequests` (Task 10) |
| `lib/api/errors.ts` | Add `EVENT_WITHDRAWN` (5071), `WITHDRAWAL_TERMS_VERSION_STALE` (5072), `WITHDRAWAL_REFUSED` (5073), `WITHDRAWAL_NOT_HELD` (5074); remove `REFUND_NOT_ELIGIBLE`, `REFUND_ALREADY_REQUESTED`, `REFUND_REQUEST_NOT_PENDING`, `ORDER_NOT_REFUNDABLE` |
| `lib/api/errorMessageKeys.ts` | Swap refund message keys for withdrawal ones |
| `lib/adminUtils.ts` | Swap refund admin message keys for `withdrawalNotHeld` |
| `hooks/useBilling.ts` | Add `useWithdrawalPreview`, `useEventWithdrawals`, `useSubmitWithdrawal`; change `useCheckout`/`useUpgradeCheckout` to require consent input; remove `useRefundEligibility`, `useEventRefundRequests`, `useRequestRefund` (Task 10) |
| `hooks/useEventWithdrawalFlow.ts` | New file, replaces `hooks/useEventRefundFlow.ts` (deleted Task 10) |
| `hooks/useAdmin.ts` | Add `useAdminWithdrawals`, `useReleaseWithdrawal`, `useWithholdWithdrawal`; remove `useAdminRefundRequests`, `useDecideRefundRequest` (Task 10) |
| `components/manage/billing/WithdrawalPanel.tsx` | New file, replaces `BillingRefundPanel.tsx` (deleted Task 10) |
| `components/manage/danger/EventWithdrawalSection.tsx` | New file, replaces `EventRefundSection.tsx` (deleted Task 10) |
| `app/(app)/(event)/events/[eventId]/manage/DangerZoneTab.tsx` | Point at the new section |
| `components/manage/OverviewDraftPanel.tsx` | "Pay and Publish" becomes a link to the review page |
| `app/(app)/(event)/events/[eventId]/checkout/review/CheckoutReviewBoundary.tsx` | Allow fresh (non-cancelled) activation; add consent UI; handle stale terms |
| `components/admin/AdminEvidenceTile.tsx` | Renamed from `RefundEvidence.tsx` (generic, no refund-specific content) |
| `components/admin/WithdrawalQueuePanel.tsx` | New file, replaces `RefundQueuePanel.tsx` (deleted Task 10) |
| `components/admin/WithdrawalRow.tsx` | New file, replaces `RefundRow.tsx` (deleted Task 10) |
| `components/admin/AdminConsole.tsx`, `AdminNavigationContext.tsx`, `AdminShellNav.tsx`, `PlatformNeedsAttention.tsx` | Rename tab `refunds` → `withdrawals` |
| `lib/notifications.ts`, `components/notifications/NotificationSeverityIcon.tsx` | Swap `REFUND_APPROVED`/`REFUND_REJECTED` for the three `WITHDRAWAL_*` types |
| `messages/en.json`, `messages/el.json` | New `withdrawal*` copy under `EventPlanSettingsPage`, `AdminPage`, `CheckoutReviewPage`, `ApiErrors`, `ManagePage.sections`; delete dead `refund*` copy (Task 10) |

---

### Task 1: Types foundation — withdrawal DTOs, OrderKind, AppWithdrawalConfigDto

**Files:**
- Modify: `lib/api/types.ts:679-754`

- [ ] **Step 1: Add `OrderKind`, extend `OrderSummaryDto`, add the withdrawal DTOs and `AppWithdrawalConfigDto`**

Replace lines 679–754 (from `export interface OrderSummaryDto {` through the end of `RefundDecisionRequestDto`) with:

```ts
export type OrderKind = 'ACTIVATION' | 'UPGRADE' | 'STORAGE_PACK';

export interface OrderSummaryDto {
    id: string;
    kind: OrderKind;
    status: 'PENDING' | 'PAID' | 'FAILED' | 'CANCELLED';
    amountMinor: number;
    addonAmountMinor: number | null;
    currency: string;
    paidAt: string | null;
    createdAt: string;
    // Added 2026-09-18 — the three-line withdrawal split (billing-fe-guide.md §8/§9),
    // summing to amountMinor. Present on every order kind but only meaningful on
    // ACTIVATION/UPGRADE.
    setupAmountMinor: number | null;
    eventDayAmountMinor: number | null;
    hostingAmountMinor: number | null;
}
export interface EventAddonDto {
    code: string;
    name: string;
    // What this cost when bought.
    priceAmountMinor: number;
    billingPeriod: BillingPeriod;
    activatedAt: string;
}

export interface EventAddonRequestDto {
    paidServiceCode: string;
}
export interface EventBillingResponseDto {
    eventStatus: EventStatus;
    planTierCode: string;
    planTierName: string;
    orders: OrderSummaryDto[];
    addons: EventAddonDto[];
}

// --- Withdrawal (billing-fe-guide.md §9) — replaces the old admin-approved refund flow ---

export type WithdrawalStatus = 'REFUSED' | 'HELD' | 'REFUNDED' | 'WITHHELD';
// 'PENDING' | 'APPROVED' | 'REJECTED' also exist on legacy rows migrated before this
// flow shipped; treat any status outside the four above as read-only history, never
// producible by a new request.

export type RefundBasis = 'CONSENTED_PRO_RATA' | 'NO_CONSENT_FULL_REFUND';

export interface WithdrawalRefusal {
    code: string;
    message: string; // show verbatim
    detail: string | null;
}

export interface WithdrawalLine {
    orderId: string;
    orderKind: OrderKind;
    basis: RefundBasis;
    hostingStart: string | null;
    hostingEnd: string | null;
    usedSeconds: number | null;
    totalSeconds: number | null;
    eventPerformed: boolean;
    refundMinor: number;
    providerRefunded: boolean;
    components: Record<string, unknown>; // display-only breakdown; shape not enumerated by the guide
}

// GET /api/events/{eventId}/withdrawal-preview — host. Nothing persisted; safe to
// call/poll any time the withdrawal screen is open.
export interface WithdrawalPreviewResponseDto {
    eligible: boolean;
    refusals: WithdrawalRefusal[];
    windowClosesAt: string;
    totalRefundMinor: number;
    currency: string;
    lines: WithdrawalLine[];
}

// POST /api/events/{eventId}/withdrawals — host. 201 with this shape when the
// outcome is REFUNDED or HELD; a REFUSED outcome is instead a 409
// WITHDRAWAL_REFUSED with the standard error envelope, NOT this shape — read
// structured refusal reasons from WithdrawalPreviewResponseDto instead.
export interface WithdrawalResponseDto {
    id: string;
    eventId: string;
    status: WithdrawalStatus;
    reason: string | null;
    createdAt: string;
    decidedAt: string | null;
    decisionNote: string | null;
    holdUntil: string | null;
    totalRefundMinor: number | null;
    currency: string | null;
    refusals: WithdrawalRefusal[];
    lines: WithdrawalLine[];
}

export interface WithdrawalRequestDto {
    reason?: string; // max 1000 chars, optional
}

// --- Admin withdrawal operations (billing-fe-guide §9/§13) ---

export interface WithdrawalFraudSignalDto {
    code: string;
    fired: boolean;
    observed: string;
    threshold: string;
}

// GET /api/admin/withdrawals — admin. The facts sheet behind each HELD request.
export interface WithdrawalAdminDto {
    request: WithdrawalResponseDto;
    usageFacts: Record<string, unknown>; // display-only; shape not enumerated by the guide
    fraudSignals: WithdrawalFraudSignalDto[]; // every signal evaluated, fired or not — show them all
    recommendation: string; // generated plain text, render as-is
}

// POST /api/admin/withdrawals/{id}/withhold — admin. note is required.
export interface WithdrawalWithholdRequestDto {
    note: string; // max 1000 chars
}
```

- [ ] **Step 2: Extend `AppConfigResponseDto` with `withdrawal`**

Find the `AppRsvpConfigDto` block (`lib/api/types.ts:229-234`) and insert a new interface right after it:

```ts
export interface AppRsvpConfigDto {
    minAdults: number;
    maxAdults: number;
    minChildren: number;
    maxChildren: number;
}

// Automated right-of-withdrawal settings — billing-fe-guide.md §9. Added 2026-09-18.
export interface AppWithdrawalConfigDto {
    // Pass back verbatim as ActivationCheckoutRequestDto/UpgradeCheckoutRequestDto's
    // termsVersion; a stale value is a 400 WITHDRAWAL_TERMS_VERSION_STALE.
    termsVersion: string;
    // Statutory withdrawal window, days after payment.
    windowDays: number;
    // How long a HELD withdrawal waits for an admin before it is released automatically.
    holdDays: number;
}
```

Then add `withdrawal: AppWithdrawalConfigDto;` to `AppConfigResponseDto` (`lib/api/types.ts:260-277`), after the `rsvp` field:

```ts
export interface AppConfigResponseDto {
    featureFlags: PlatformFeatureFlagResponseDto[];
    media: AppMediaConfigDto;
    pagination: { defaultPageSize: number; maxPageSize: number };
    planTiers: PlanTierResponseDto[];
    paidServices: PaidServiceResponseDto[];
    eventModuleKeys: ModuleKey[];
    modules: PlatformModuleResponseDto[];
    eventTypes: AppEventTypeResponseDto[];
    eventTypeKeys: EventTypeConvention[];
    translations: AppTranslationsDto;
    rsvp: AppRsvpConfigDto;
    withdrawal: AppWithdrawalConfigDto;
    contentLimits: AppContentLimitsDto;
    reactionTypesByEventType: Record<string, ReactionTypeResponseDto[]>;
    rateLimits: AppRateLimitConfigDto[];
    reportTargetTypes: ReportTargetType[];
    reportReasons: ReportReason[];
}
```

- [ ] **Step 3: Add the shared consent DTO and extend the two checkout request DTOs**

Find `CheckoutRequestDto` (`lib/api/types.ts:543-549`) and replace it and `UpgradeCheckoutRequestDto` (`lib/api/types.ts:664-666`) as follows.

Replace:
```ts
export interface CheckoutResponseDto {
    orderId: string;
    redirectUrl: string;
}
export interface CheckoutRequestDto {
    collaborationCode?: string;
}
```
with:
```ts
export interface CheckoutResponseDto {
    orderId: string;
    redirectUrl: string;
}

// Shared by activation and upgrade checkout — the consent Directive 2011/83/EU
// art. 14(3)/(4)(a) requires before a paid service may begin inside the
// withdrawal window. Both booleans MUST be sent true; termsVersion comes from
// AppConfigResponseDto.withdrawal.termsVersion. Added 2026-09-18 — a body is now
// required on both checkout endpoints, where none was required before.
export interface WithdrawalConsentDto {
    requestsImmediateStart: boolean;
    acknowledgesWithdrawalTerms: boolean;
    termsVersion: string;
}

// POST /api/events/{eventId}/checkout — host, DRAFT only (billing-fe-guide §6).
export interface CheckoutRequestDto extends WithdrawalConsentDto {
    collaborationCode?: string;
}
```

And replace (`lib/api/types.ts:664-666`):
```ts
export interface UpgradeCheckoutRequestDto {
    planTierCode: PlanTierCode;
}
```
with:
```ts
// POST /api/events/{eventId}/upgrade-checkout — host, ACTIVE only (billing-fe-guide §7d).
export interface UpgradeCheckoutRequestDto extends WithdrawalConsentDto {
    planTierCode: PlanTierCode;
}
```

- [ ] **Step 4: Verify**

Run:
```bash
npx tsc --noEmit -p .
```
Expected: errors only in files that construct `CheckoutRequestDto`/`UpgradeCheckoutRequestDto` without the new required fields (`hooks/useBilling.ts`, `app/(app)/(event)/events/[eventId]/checkout/review/CheckoutReviewBoundary.tsx`, `components/manage/OverviewDraftPanel.tsx`) — these are fixed in Tasks 2–3. No errors anywhere else yet, since nothing else references the new types.

- [ ] **Step 5: Commit**

```bash
git add lib/api/types.ts
git commit -m "feat(billing): add withdrawal types, replacing the refund-request contract"
```

---

### Task 2: Endpoints — add withdrawal routes

**Files:**
- Modify: `lib/api/endpoints.ts:98-104`, `lib/api/endpoints.ts:261-265`

- [ ] **Step 1: Add the two host withdrawal routes next to the existing refund ones**

In the `events` block, replace lines 98–104:
```ts
        checkout: (eventId: string) => `/api/events/${eventId}/checkout`,
        checkoutCodePreview: (eventId: string) => `/api/events/${eventId}/checkout/preview-code`,
        upgradeCheckout: (eventId: string) => `/api/events/${eventId}/upgrade-checkout`,
        upgradeOptions: (eventId: string) => `/api/events/${eventId}/upgrade-options`,
        storageCheckout: (eventId: string) => `/api/events/${eventId}/storage-checkout`,
        refundEligibility: (eventId: string) => `/api/events/${eventId}/refund-eligibility`,
        refundRequests: (eventId: string) => `/api/events/${eventId}/refund-requests`,
```
with:
```ts
        checkout: (eventId: string) => `/api/events/${eventId}/checkout`,
        checkoutCodePreview: (eventId: string) => `/api/events/${eventId}/checkout/preview-code`,
        upgradeCheckout: (eventId: string) => `/api/events/${eventId}/upgrade-checkout`,
        upgradeOptions: (eventId: string) => `/api/events/${eventId}/upgrade-options`,
        storageCheckout: (eventId: string) => `/api/events/${eventId}/storage-checkout`,
        withdrawalPreview: (eventId: string) => `/api/events/${eventId}/withdrawal-preview`,
        // GET (history) and POST (submit) both hit this same path.
        withdrawals: (eventId: string) => `/api/events/${eventId}/withdrawals`,
        refundEligibility: (eventId: string) => `/api/events/${eventId}/refund-eligibility`,
        refundRequests: (eventId: string) => `/api/events/${eventId}/refund-requests`,
```

- [ ] **Step 2: Add the admin withdrawal routes next to the existing admin refund ones**

Replace lines 261–265:
```ts
        refundRequests: {
            list: '/api/admin/refund-requests',
            approve: (requestId: string) => `/api/admin/refund-requests/${requestId}/approve`,
            reject: (requestId: string) => `/api/admin/refund-requests/${requestId}/reject`,
        },
```
with:
```ts
        withdrawals: {
            list: '/api/admin/withdrawals',
            release: (requestId: string) => `/api/admin/withdrawals/${requestId}/release`,
            withhold: (requestId: string) => `/api/admin/withdrawals/${requestId}/withhold`,
        },
        refundRequests: {
            list: '/api/admin/refund-requests',
            approve: (requestId: string) => `/api/admin/refund-requests/${requestId}/approve`,
            reject: (requestId: string) => `/api/admin/refund-requests/${requestId}/reject`,
        },
```

- [ ] **Step 3: Verify and commit**

```bash
npx tsc --noEmit -p .
git add lib/api/endpoints.ts
git commit -m "feat(billing): add withdrawal endpoint paths"
```

---

### Task 3: Checkout consent — hooks

**Files:**
- Modify: `hooks/useBilling.ts:70-79`, `hooks/useBilling.ts:94-105`

- [ ] **Step 1: Require consent input on `useCheckout` and `useUpgradeCheckout`**

Replace (`hooks/useBilling.ts:70-79`):
```ts
export function useCheckout(eventId: string) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (input?: CheckoutRequestDto) => api.post<CheckoutResponseDto>(endpoints.events.checkout(eventId), input),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: billingKeys.event(eventId) });
            queryClient.invalidateQueries({ queryKey: ['events', eventId] });
        },
    });
}
```
with:
```ts
export function useCheckout(eventId: string) {
    const queryClient = useQueryClient();
    return useMutation({
        // A body is required as of 2026-09 — requestsImmediateStart/acknowledgesWithdrawalTerms
        // are mandatory consent, not optional metadata (billing-fe-guide §6).
        mutationFn: (input: CheckoutRequestDto) => api.post<CheckoutResponseDto>(endpoints.events.checkout(eventId), input),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: billingKeys.event(eventId) });
            queryClient.invalidateQueries({ queryKey: ['events', eventId] });
        },
    });
}
```

Replace (`hooks/useBilling.ts:94-105`, the `useUpgradeCheckout` function) — only the `mutationFn` line changes, the rest of the function is unchanged:
```ts
        mutationFn: (input: UpgradeCheckoutRequestDto) => api.post<CheckoutResponseDto>(endpoints.events.upgradeCheckout(eventId), input),
```
This line already types `input` as `UpgradeCheckoutRequestDto` (now carrying the consent fields via Task 1's change), so no edit is needed here beyond what Task 1 already did to the type — leave this line as-is.

- [ ] **Step 2: Add the three withdrawal hooks**

Add these functions to `hooks/useBilling.ts`, replacing the existing `useRefundEligibility`, `useEventRefundRequests`, and `useRequestRefund` functions (`hooks/useBilling.ts:129-164`) — **append** the new ones after the old three for now (the old three are deleted in Task 10, once `useEventRefundFlow.ts` no longer imports them):

```ts
// GET /api/events/{id}/withdrawal-preview — host. Nothing is persisted server-side,
// so this is safe to poll while a confirmation dialog is open (billing-fe-guide §9).
export function useWithdrawalPreview(eventId: string | null, enabled = true) {
    const { isAuthenticated } = useAuth();

    return useQuery({
        queryKey: ['events', eventId, 'withdrawal-preview'],
        queryFn: () => api.get<WithdrawalPreviewResponseDto>(endpoints.events.withdrawalPreview(eventId!)),
        enabled: Boolean(eventId) && enabled && isAuthenticated,
    });
}

// GET /api/events/{id}/withdrawals — the host's own history, newest first, so the
// most recent outcome (and its lines/refusals) survives a reload.
export function useEventWithdrawals(eventId: string | null) {
    const { isAuthenticated } = useAuth();

    return useQuery({
        queryKey: ['events', eventId, 'withdrawals'],
        queryFn: () => api.get<WithdrawalResponseDto[]>(endpoints.events.withdrawals(eventId!)),
        enabled: Boolean(eventId) && isAuthenticated,
        select: (withdrawals) => [...withdrawals].sort((left, right) => right.createdAt.localeCompare(left.createdAt)),
    });
}

// POST /api/events/{id}/withdrawals — terminal on REFUNDED (the event is
// soft-deleted in the same call). A REFUSED outcome throws a 409 WITHDRAWAL_REFUSED
// instead of resolving — read structured reasons from the preview, not this call.
export function useSubmitWithdrawal(eventId: string) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (input: WithdrawalRequestDto) => api.post<WithdrawalResponseDto>(endpoints.events.withdrawals(eventId), input),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['events', eventId] });
            queryClient.invalidateQueries({ queryKey: ['events', eventId, 'withdrawal-preview'] });
            queryClient.invalidateQueries({ queryKey: ['events', eventId, 'withdrawals'] });
            queryClient.invalidateQueries({ queryKey: billingKeys.event(eventId) });
        },
    });
}
```

- [ ] **Step 3: Update the import block**

At the top of `hooks/useBilling.ts`, replace the type import list:
```ts
import type {
    CheckoutRequestDto,
    CheckoutResponseDto,
    CollaborationCodePreviewRequestDto,
    CollaborationCodePreviewResponseDto,
    CreateEventCodePreviewRequestDto,
    EventAddonDto,
    EventAddonRequestDto,
    EventBillingResponseDto,
    RefundEligibilityResponseDto,
    RefundRequestResponseDto,
    StorageCheckoutRequestDto,
    UpgradeCheckoutRequestDto,
    UpgradeOptionResponseDto,
} from '@/lib/api/types';
```
with:
```ts
import type {
    CheckoutRequestDto,
    CheckoutResponseDto,
    CollaborationCodePreviewRequestDto,
    CollaborationCodePreviewResponseDto,
    CreateEventCodePreviewRequestDto,
    EventAddonDto,
    EventAddonRequestDto,
    EventBillingResponseDto,
    RefundEligibilityResponseDto,
    RefundRequestResponseDto,
    StorageCheckoutRequestDto,
    UpgradeCheckoutRequestDto,
    UpgradeOptionResponseDto,
    WithdrawalPreviewResponseDto,
    WithdrawalRequestDto,
    WithdrawalResponseDto,
} from '@/lib/api/types';
```

- [ ] **Step 4: Verify and commit**

```bash
npx tsc --noEmit -p .
```
Expected: remaining errors only at the two checkout call sites (`CheckoutReviewBoundary.tsx`, `OverviewDraftPanel.tsx`) — fixed in Task 4.

```bash
git add hooks/useBilling.ts
git commit -m "feat(billing): add withdrawal preview/history/submit hooks; require checkout consent"
```

---

### Task 4: Checkout consent — UI

**Files:**
- Modify: `components/manage/OverviewDraftPanel.tsx`
- Modify: `app/(app)/(event)/events/[eventId]/checkout/review/CheckoutReviewBoundary.tsx`
- Modify: `messages/en.json`, `messages/el.json`

- [ ] **Step 1: Route "Pay and Publish" through the review page instead of calling checkout directly**

In `components/manage/OverviewDraftPanel.tsx`, remove the direct-checkout call entirely. Replace the imports:
```ts
import { Calendar, Clock3, Loader2, Receipt } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useState } from 'react';

import { EventOverviewPriceRow } from '@/components/event/create/EventOverviewPriceRow';
import { GiftAccountSetup } from '@/components/manage/GiftAccountSetup';
import { TargetedSection } from '@/components/manage/TargetedSection';
import { useApiErrorMessage } from '@/hooks/useApiErrorMessage';
import { useCheckout } from '@/hooks/useBilling';
import { useLocalizedAppEventTypeCopy } from '@/hooks/useLocalizedAppEventTypeCopy';
import type { EventBillingResponseDto, EventTypeConvention, PlanTierResponseDto } from '@/lib/api/types';
import { formatMoney, navigateToCheckout } from '@/lib/billing';
import { GIFT_ACCOUNT_SECTION_ID } from '@/lib/manageSectionTargets';
import { getPlanPriceDetails } from '@/lib/planTiers';
```
with:
```ts
import { Calendar, Clock3, Receipt } from 'lucide-react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';

import { EventOverviewPriceRow } from '@/components/event/create/EventOverviewPriceRow';
import { GiftAccountSetup } from '@/components/manage/GiftAccountSetup';
import { TargetedSection } from '@/components/manage/TargetedSection';
import { useLocalizedAppEventTypeCopy } from '@/hooks/useLocalizedAppEventTypeCopy';
import type { EventBillingResponseDto, EventTypeConvention, PlanTierResponseDto } from '@/lib/api/types';
import { formatMoney } from '@/lib/billing';
import { GIFT_ACCOUNT_SECTION_ID } from '@/lib/manageSectionTargets';
import { getPlanPriceDetails } from '@/lib/planTiers';
import { routes } from '@/lib/routes';
```

Remove the hook calls and handler (previously lines 43–60):
```ts
    const checkout = useCheckout(eventId);
    const toErrorMessage = useApiErrorMessage();
    const [error, setError] = useState<string | null>(null);
    const canPay = Boolean(startAt);
    const planActivation = currentPlan ? getPlanPriceDetails(currentPlan) : null;
    const activationTotalLabel = activationTotal !== null ? formatMoney(locale, activationTotal, currency) : tCreate('payment.noCharge');
    const dateFormatter = new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' });

    async function handlePay() {
        if (!canPay) return;
        setError(null);

        try {
            navigateToCheckout(eventId, await checkout.mutateAsync(undefined));
        } catch (checkoutError) {
            setError(toErrorMessage(checkoutError));
        }
    }
```
with:
```ts
    const canPay = Boolean(startAt);
    const planActivation = currentPlan ? getPlanPriceDetails(currentPlan) : null;
    const activationTotalLabel = activationTotal !== null ? formatMoney(locale, activationTotal, currency) : tCreate('payment.noCharge');
    const dateFormatter = new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' });
```

Replace the payment action block (previously lines 136–157):
```ts
                <div className="mt-4">
                    {canPay ? (
                        <button
                            type="button"
                            onClick={handlePay}
                            disabled={checkout.isPending}
                            className="inline-flex min-h-11 w-full items-center justify-center rounded-full bg-ink px-4 text-sm font-semibold text-white"
                        >
                            {checkout.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
                            {checkout.isPending ? t('draft.openingCheckout') : t('draft.payAndPublish')}
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
                {error && <p className="mt-3 text-sm text-rose-600">{error}</p>}
```
with:
```ts
                <div className="mt-4">
                    {canPay ? (
                        <Link
                            href={routes.events.checkoutReview(eventId, 'activation')}
                            className="inline-flex min-h-11 w-full items-center justify-center rounded-full bg-ink px-4 text-sm font-semibold text-white"
                        >
                            {t('draft.payAndPublish')}
                        </Link>
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
```

- [ ] **Step 2: Allow a fresh (non-cancelled) activation to render on the review page**

In `CheckoutReviewBoundary.tsx`, remove the `(intent === 'activation' && !isCancelledActivation)` clause from the invalid-condition check. Replace:
```ts
    if (
        appConfig.error ||
        billing.error ||
        event.error ||
        !billing.data ||
        !currentPlan ||
        !intent ||
        (intent === 'activation' && !isCancelledActivation) ||
        (intent === 'upgrade' && upgradeOptions.error)
    ) {
```
with:
```ts
    if (
        appConfig.error ||
        billing.error ||
        event.error ||
        !billing.data ||
        !currentPlan ||
        !intent ||
        (intent === 'upgrade' && upgradeOptions.error)
    ) {
```

- [ ] **Step 3: Branch activation copy on `isCancelledActivation`**

Replace the activation branch of the title/description/consequence assignment:
```ts
    if (intent === 'activation') {
        title = t('intent.activationCancelled.title');
        description = t('intent.activationCancelled.description');
        consequence = t('intent.activationCancelled.consequence');
        valid = billing.data.eventStatus === 'DRAFT' && currentPlan.priceAmountMinor !== null;
```
with:
```ts
    if (intent === 'activation') {
        title = t(isCancelledActivation ? 'intent.activationCancelled.title' : 'intent.activation.title');
        description = t(isCancelledActivation ? 'intent.activationCancelled.description' : 'intent.activation.description');
        consequence = t(isCancelledActivation ? 'intent.activationCancelled.consequence' : 'intent.activation.consequence');
        valid = billing.data.eventStatus === 'DRAFT' && currentPlan.priceAmountMinor !== null;
```

(`intent.activation.*` already exists in both `messages/en.json` and `messages/el.json` — it was added for this exact case and never wired up. No translation change needed for this step.)

- [ ] **Step 4: Add consent state, the consent section, and stale-terms handling**

Add imports (top of file), alongside the existing ones:
```ts
import { ERROR_CODES, getErrorCode } from '@/lib/api/errors';
```

Add state, right after the existing `collaborationPreview` state:
```ts
    const [requestsImmediateStart, setRequestsImmediateStart] = useState(false);
    const [acknowledgesWithdrawalTerms, setAcknowledgesWithdrawalTerms] = useState(false);
    const [staleTerms, setStaleTerms] = useState(false);
    const handleRequestsImmediateStartChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
        setRequestsImmediateStart(event.target.checked);
    }, []);
    const handleAcknowledgesWithdrawalTermsChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
        setAcknowledgesWithdrawalTerms(event.target.checked);
    }, []);
```
This needs `ChangeEvent` imported from `react`: add `import { useCallback, useMemo, useState, type ChangeEvent } from 'react';` in place of the existing `import { useCallback, useMemo, useState } from 'react';`.

Requires consent for `activation` and `upgrade` (not `storage`, which has no consent fields per the guide):
```ts
    const requiresConsent = intent === 'activation' || intent === 'upgrade';
    const termsVersion = appConfig.data?.withdrawal.termsVersion ?? null;
    const consentSatisfied = !requiresConsent || (requestsImmediateStart && acknowledgesWithdrawalTerms && Boolean(termsVersion));
```

Replace `continueToCheckout`'s body to attach consent and handle the stale-terms error code:
```ts
    async function continueToCheckout() {
        if (!valid || !consentSatisfied) return;
        setError(null);
        setStaleTerms(false);
        try {
            if (intent === 'activation') {
                navigateToCheckout(
                    eventId,
                    await activationCheckout.mutateAsync({
                        ...(collaborationCode ? { collaborationCode } : {}),
                        requestsImmediateStart,
                        acknowledgesWithdrawalTerms,
                        termsVersion: termsVersion!,
                    })
                );
            } else if (intent === 'upgrade' && targetPlan) {
                navigateToCheckout(
                    eventId,
                    await upgradeCheckout.mutateAsync({
                        planTierCode: targetPlan.code,
                        requestsImmediateStart,
                        acknowledgesWithdrawalTerms,
                        termsVersion: termsVersion!,
                    }),
                    targetPlan.code
                );
            } else if (intent === 'storage' && service) {
                navigateToCheckout(eventId, await storageCheckout.mutateAsync({ paidServiceCode: service.code }));
            }
        } catch (checkoutError) {
            if (getErrorCode(checkoutError) === ERROR_CODES.WITHDRAWAL_TERMS_VERSION_STALE) {
                setStaleTerms(true);
                setRequestsImmediateStart(false);
                setAcknowledgesWithdrawalTerms(false);
                void appConfig.refetch();
                setError(t('withdrawalTerms.stale'));
                return;
            }
            setError(toErrorMessage(checkoutError));
        }
    }
```

Add the consent section in the JSX, right before the "Payment consequence" section:
```tsx
            {/* Withdrawal consent */}
            {requiresConsent && (
                <section className="mt-6 rounded-lg border border-border bg-surface-muted/40 p-4" aria-labelledby="withdrawal-terms-title">
                    <h2 id="withdrawal-terms-title" className="text-base font-bold text-ink">
                        {t('withdrawalTerms.title')}
                    </h2>
                    {/* Placeholder copy — pending real legal/product text (Directive 2011/83/EU art. 14). */}
                    <p className="mt-1 text-sm leading-relaxed text-ink-muted">{t('withdrawalTerms.body')}</p>
                    <label className="mt-3 flex items-start gap-2.5 text-sm">
                        <input
                            type="checkbox"
                            checked={requestsImmediateStart}
                            onChange={handleRequestsImmediateStartChange}
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
                            onChange={handleAcknowledgesWithdrawalTermsChange}
                            className="mt-0.5 h-4 w-4 shrink-0 rounded border-border"
                        />
                        <span>
                            <span className="font-semibold text-ink">{t('withdrawalTerms.acknowledgesWithdrawalTermsLabel')}</span>
                            <span className="block text-xs text-ink-muted">{t('withdrawalTerms.acknowledgesWithdrawalTermsCaption')}</span>
                        </span>
                    </label>
                    {staleTerms && <p className="mt-2 text-xs font-semibold text-rose-600">{t('withdrawalTerms.stale')}</p>}
                </section>
            )}
```

And update the submit button's `disabled` condition:
```tsx
                <button
                    type="button"
                    onClick={continueToCheckout}
                    disabled={!valid || lines.length === 0 || isPending || !consentSatisfied}
```

- [ ] **Step 5: Add translations**

In `messages/en.json`, under `CheckoutReviewPage` (alongside `intent`), add:
```json
  "withdrawalTerms": {
    "title": "Right of withdrawal",
    "body": "Under EU consumer law, you normally have 14 days to change your mind about a paid service. To publish and start using this plan right away, you need to ask for immediate start and acknowledge that doing so affects your withdrawal rights.",
    "requestsImmediateStartLabel": "Start providing this service immediately",
    "requestsImmediateStartCaption": "Rather than waiting out the 14-day period first.",
    "acknowledgesWithdrawalTermsLabel": "I understand this affects my right to a full refund",
    "acknowledgesWithdrawalTermsCaption": "Once the service starts, part of the charge may no longer be refundable if you withdraw later.",
    "stale": "These terms were updated. Review them again and confirm once more."
  }
```

In `messages/el.json`, under `CheckoutReviewPage`, add:
```json
  "withdrawalTerms": {
    "title": "Δικαίωμα υπαναχώρησης",
    "body": "Σύμφωνα με την ενωσιακή νομοθεσία καταναλωτή, έχετε συνήθως 14 ημέρες για να αλλάξετε γνώμη σχετικά με μια επί πληρωμή υπηρεσία. Για να δημοσιεύσετε και να χρησιμοποιήσετε αυτό το πλάνο αμέσως, πρέπει να ζητήσετε άμεση έναρξη και να αναγνωρίσετε ότι αυτό επηρεάζει το δικαίωμα υπαναχώρησης.",
    "requestsImmediateStartLabel": "Άμεση έναρξη παροχής της υπηρεσίας",
    "requestsImmediateStartCaption": "Αντί να περιμένετε πρώτα την περίοδο των 14 ημερών.",
    "acknowledgesWithdrawalTermsLabel": "Κατανοώ ότι αυτό επηρεάζει το δικαίωμά μου για πλήρη επιστροφή χρημάτων",
    "acknowledgesWithdrawalTermsCaption": "Μόλις ξεκινήσει η υπηρεσία, μέρος της χρέωσης ενδέχεται να μην επιστρέφεται αν υπαναχωρήσετε αργότερα.",
    "stale": "Οι όροι ενημερώθηκαν. Ελέγξτε τους ξανά και επιβεβαιώστε εκ νέου."
  }
```

- [ ] **Step 6: Verify**

```bash
npx tsc --noEmit -p .
npx eslint components/manage/OverviewDraftPanel.tsx "app/(app)/(event)/events/[eventId]/checkout/review/CheckoutReviewBoundary.tsx"
```
Expected: no errors.

- [ ] **Step 7: Manually verify in the browser**

```bash
npm run dev
```
Navigate to a `DRAFT` event's manage/overview tab with a `startAt` set. Confirm:
- "Pay and Publish" now navigates to `/events/{id}/checkout/review?intent=activation` instead of calling checkout directly.
- The review page renders with title "Order preview" (not "Payment cancelled").
- The withdrawal consent section renders with both checkboxes unchecked and "Continue to checkout" disabled.
- Checking both boxes enables the button.
- The existing cancelled-activation retry flow (`/checkout/cancelled` → review with `cancelled=true`) still shows the "Payment cancelled" copy.

- [ ] **Step 8: Commit**

```bash
git add components/manage/OverviewDraftPanel.tsx "app/(app)/(event)/events/[eventId]/checkout/review/CheckoutReviewBoundary.tsx" messages/en.json messages/el.json
git commit -m "feat(billing): add withdrawal consent UI to checkout review, route activation through it"
```

---

### Task 5: Host withdrawal flow — hook

**Files:**
- Create: `hooks/useEventWithdrawalFlow.ts`

- [ ] **Step 1: Write the new flow hook**

```ts
'use client';

import type React from 'react';
import type { ChangeEvent } from 'react';
import { useCallback, useState } from 'react';

import { useApiErrorMessage, useRetryAfterCountdown } from '@/hooks/useApiErrorMessage';
import { useEventWithdrawals, useSubmitWithdrawal, useWithdrawalPreview } from '@/hooks/useBilling';

/**
 * The withdrawal preview/history/submit state, extracted out on its own (Danger
 * zone) the same way useEventRefundFlow used to be — replaces it entirely.
 */
export function useEventWithdrawalFlow(eventId: string) {
    const withdrawalPreview = useWithdrawalPreview(eventId);
    const submitWithdrawal = useSubmitWithdrawal(eventId);
    const withdrawalHistory = useEventWithdrawals(eventId);
    const toErrorMessage = useApiErrorMessage();
    const withdrawalRetryIn = useRetryAfterCountdown(submitWithdrawal.error);

    const [withdrawalReason, setWithdrawalReason] = useState('');
    const [withdrawalError, setWithdrawalError] = useState<string | null>(null);
    const [confirmingWithdrawal, setConfirmingWithdrawal] = useState(false);

    // Server-side history, so a REFUNDED/HELD/WITHHELD outcome survives a reload —
    // the page used to only know about a request the same tab had just submitted.
    const latestWithdrawal = withdrawalHistory.data?.[0] ?? null;

    const cancelWithdrawalConfirmation = useCallback(() => setConfirmingWithdrawal(false), []);

    const handleWithdrawalReasonChange = useCallback((event: ChangeEvent<HTMLTextAreaElement>) => {
        setWithdrawalReason(event.target.value);
    }, []);

    const askWithdrawalConfirmation = useCallback((event: React.SubmitEvent<HTMLFormElement>) => {
        event.preventDefault();
        setWithdrawalError(null);
        setConfirmingWithdrawal(true);
    }, []);

    const submitWithdrawalRequest = useCallback(async () => {
        setWithdrawalError(null);
        try {
            await submitWithdrawal.mutateAsync(withdrawalReason.trim() ? { reason: withdrawalReason.trim() } : {});
            setWithdrawalReason('');
            setConfirmingWithdrawal(false);
        } catch (e) {
            setWithdrawalError(toErrorMessage(e));
            setConfirmingWithdrawal(false);
        }
    }, [withdrawalReason, submitWithdrawal, toErrorMessage]);

    return {
        withdrawalPreview,
        withdrawalHistory,
        latestWithdrawal,
        withdrawalReason,
        withdrawalError,
        withdrawalRetryIn,
        confirmingWithdrawal,
        isSubmittingWithdrawal: submitWithdrawal.isPending,
        handleWithdrawalReasonChange,
        askWithdrawalConfirmation,
        submitWithdrawalRequest,
        cancelWithdrawalConfirmation,
    };
}

export type EventWithdrawalFlow = ReturnType<typeof useEventWithdrawalFlow>;
```

- [ ] **Step 2: Verify and commit**

```bash
npx tsc --noEmit -p .
npx eslint hooks/useEventWithdrawalFlow.ts
git add hooks/useEventWithdrawalFlow.ts
git commit -m "feat(billing): add useEventWithdrawalFlow, replacing useEventRefundFlow"
```

(`hooks/useEventRefundFlow.ts` is deleted in Task 10, once `EventRefundSection.tsx` no longer imports it.)

---

### Task 6: Host withdrawal flow — UI

**Files:**
- Create: `components/manage/billing/WithdrawalPanel.tsx`
- Create: `components/manage/danger/EventWithdrawalSection.tsx`
- Modify: `app/(app)/(event)/events/[eventId]/manage/DangerZoneTab.tsx`
- Modify: `messages/en.json`, `messages/el.json`

- [ ] **Step 1: Write `WithdrawalPanel.tsx`**

Mirrors `BillingRefundPanel.tsx`'s structure (loading → decided outcome → refusals → form), against the new preview/submit shapes.

```tsx
import { Loader2 } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';

import { ConfirmActionModal } from '@/components/ui/ConfirmActionModal';
import type { EventWithdrawalFlow } from '@/hooks/useEventWithdrawalFlow';
import { formatMoney } from '@/lib/billing';

export function WithdrawalPanel({ panel }: { panel: EventWithdrawalFlow }) {
    const t = useTranslations('EventPlanSettingsPage');
    const tCommon = useTranslations('Common');
    const locale = useLocale();
    const { withdrawalPreview, withdrawalHistory, latestWithdrawal } = panel;

    if (withdrawalPreview.isLoading || withdrawalHistory.isLoading) {
        return <p className="text-sm text-ink-muted">{t('withdrawal.loading')}</p>;
    }

    // A REFUNDED withdrawal is terminal — the event is soft-deleted server-side.
    // HELD leaves the event untouched pending an admin decision; WITHHELD means an
    // admin refused it (and the host's account was suspended in the same action).
    if (latestWithdrawal && latestWithdrawal.status !== 'REFUSED') {
        return (
            <div className="space-y-2 text-sm">
                <div className="flex items-start justify-between gap-3">
                    <p className="font-semibold text-ink">
                        {latestWithdrawal.totalRefundMinor !== null && latestWithdrawal.currency
                            ? formatMoney(locale, latestWithdrawal.totalRefundMinor, latestWithdrawal.currency)
                            : t('withdrawal.requestedNoAmount')}
                    </p>
                    <span className="rounded-full bg-background px-2 py-0.5 text-[11px] font-semibold text-ink-muted">
                        {t(`withdrawalStatus.${latestWithdrawal.status}`)}
                    </span>
                </div>
                {latestWithdrawal.status === 'HELD' && <p className="text-xs leading-relaxed text-ink-muted">{t('withdrawal.held')}</p>}
                {latestWithdrawal.status === 'WITHHELD' && latestWithdrawal.decisionNote && (
                    <p className="text-xs leading-relaxed text-ink-muted">{latestWithdrawal.decisionNote}</p>
                )}
                {latestWithdrawal.status === 'REFUNDED' && <p className="text-xs leading-relaxed text-ink-muted">{t('withdrawal.refunded')}</p>}
            </div>
        );
    }

    if (!withdrawalPreview.data?.eligible) {
        return (
            <div className="text-sm">
                <p className="text-ink-muted">{t('withdrawal.notEligible')}</p>
                {withdrawalPreview.data?.refusals.length ? (
                    <ul className="mt-2 space-y-1 text-xs text-ink-faint">
                        {withdrawalPreview.data.refusals.map((refusal) => (
                            <li key={refusal.code}>{refusal.message}</li>
                        ))}
                    </ul>
                ) : null}
            </div>
        );
    }

    return (
        <>
            <form onSubmit={panel.askWithdrawalConfirmation} className="space-y-3 text-sm">
                <p className="text-ink-muted">
                    {t('withdrawal.eligible', {
                        amount: formatMoney(locale, withdrawalPreview.data.totalRefundMinor, withdrawalPreview.data.currency),
                    })}
                </p>
                <label className="block">
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">
                        {t('withdrawal.reason')} <span className="text-ink-faint/80">({tCommon('optional')})</span>
                    </span>
                    <textarea
                        value={panel.withdrawalReason}
                        onChange={panel.handleWithdrawalReasonChange}
                        rows={2}
                        maxLength={1000}
                        className="mt-1 w-full rounded-lg bg-background px-3 py-2 text-sm text-ink outline-none transition focus:ring-2 focus:ring-primary/15"
                        placeholder={t('withdrawal.reasonPlaceholder')}
                    />
                </label>
                {panel.withdrawalError && <p className="text-xs text-rose-600">{panel.withdrawalError}</p>}
                <button
                    type="submit"
                    disabled={panel.isSubmittingWithdrawal}
                    className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-surface-muted px-3 py-2 text-xs font-semibold text-ink disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto"
                >
                    {panel.isSubmittingWithdrawal && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    {panel.isSubmittingWithdrawal ? t('withdrawal.submitting') : t('withdrawal.submit')}
                </button>
            </form>

            <ConfirmActionModal
                open={panel.confirmingWithdrawal}
                title={t('withdrawal.submit')}
                body={t('withdrawal.confirmBody')}
                confirmLabel={panel.withdrawalRetryIn > 0 ? t('actions.retryIn', { seconds: panel.withdrawalRetryIn }) : t('withdrawal.confirmSubmit')}
                cancelLabel={t('withdrawal.confirmCancel')}
                onCloseAction={panel.cancelWithdrawalConfirmation}
                onConfirmAction={panel.submitWithdrawalRequest}
                isConfirming={panel.isSubmittingWithdrawal || panel.withdrawalRetryIn > 0}
            />
        </>
    );
}
```

- [ ] **Step 2: Write `EventWithdrawalSection.tsx`**

```tsx
'use client';

import { WithdrawalPanel } from '@/components/manage/billing/WithdrawalPanel';
import { useEventWithdrawalFlow } from '@/hooks/useEventWithdrawalFlow';

export function EventWithdrawalSection({ eventId }: { eventId: string }) {
    const withdrawalFlow = useEventWithdrawalFlow(eventId);

    return (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4">
            <WithdrawalPanel panel={withdrawalFlow} />
        </div>
    );
}
```

- [ ] **Step 3: Wire it into `DangerZoneTab.tsx`**

Replace the import and usage:
```ts
import { EventRefundSection } from '@/components/manage/danger/EventRefundSection';
```
with:
```ts
import { EventWithdrawalSection } from '@/components/manage/danger/EventWithdrawalSection';
```
and:
```tsx
            {/* Refund */}
            <section>
                <h3 className="mb-2 text-sm font-semibold text-ink">{t('sections.refund')}</h3>
                <EventRefundSection eventId={event.id} />
            </section>
```
with:
```tsx
            {/* Withdrawal */}
            <section>
                <h3 className="mb-2 text-sm font-semibold text-ink">{t('sections.withdrawal')}</h3>
                <EventWithdrawalSection eventId={event.id} />
            </section>
```

- [ ] **Step 4: Add translations**

In `messages/en.json`:
- Add `"withdrawal": "Withdrawal"` under `ManagePage.sections` (alongside the existing `"refund": "Refund"`, which is removed in Task 10).
- Add a new `withdrawal` and `withdrawalStatus` block under `EventPlanSettingsPage` (alongside `refund`/`refundStatus`, removed in Task 10):
```json
  "withdrawal": {
    "loading": "Checking...",
    "eligible": "You can withdraw for a refund of {amount}.",
    "notEligible": "Withdrawal isn't available right now.",
    "reason": "Reason",
    "reasonPlaceholder": "Optional note",
    "submit": "Request withdrawal",
    "submitting": "Submitting...",
    "requestedNoAmount": "Amount will be set once processed.",
    "confirmBody": "This permanently takes the event offline. Guests lose access and there is no undo.",
    "confirmSubmit": "Yes, withdraw",
    "confirmCancel": "Cancel",
    "held": "Under review. We'll email you once it's decided.",
    "refunded": "Refunded. The event has been taken offline."
  },
  "withdrawalStatus": {
    "HELD": "Under review",
    "REFUNDED": "Refunded",
    "WITHHELD": "Refused"
  }
```

In `messages/el.json`, add the matching `"withdrawal": "Απόσυρση"` under `ManagePage.sections`, and:
```json
  "withdrawal": {
    "loading": "Έλεγχος...",
    "eligible": "Μπορείτε να υπαναχωρήσετε για επιστροφή {amount}.",
    "notEligible": "Η υπαναχώρηση δεν είναι διαθέσιμη αυτή τη στιγμή.",
    "reason": "Αιτία",
    "reasonPlaceholder": "Προαιρετική σημείωση",
    "submit": "Αίτημα υπαναχώρησης",
    "submitting": "Υποβολή...",
    "requestedNoAmount": "Το ποσό θα οριστεί μόλις υπολογιστεί.",
    "confirmBody": "Αυτό αποσύρει οριστικά την εκδήλωση. Οι καλεσμένοι χάνουν την πρόσβαση και δεν υπάρχει αναίρεση.",
    "confirmSubmit": "Ναι, υπαναχώρηση",
    "confirmCancel": "Ακύρωση",
    "held": "Υπό εξέταση. Θα σας ενημερώσουμε μόλις αποφασιστεί.",
    "refunded": "Έγινε επιστροφή χρημάτων. Η εκδήλωση αποσύρθηκε."
  },
  "withdrawalStatus": {
    "HELD": "Υπό εξέταση",
    "REFUNDED": "Επιστράφηκε",
    "WITHHELD": "Απορρίφθηκε"
  }
```

- [ ] **Step 5: Verify**

```bash
npx tsc --noEmit -p .
npx eslint components/manage/billing/WithdrawalPanel.tsx components/manage/danger/EventWithdrawalSection.tsx "app/(app)/(event)/events/[eventId]/manage/DangerZoneTab.tsx"
```

- [ ] **Step 6: Manually verify in the browser**

On an `ACTIVE` event's manage → danger zone tab, confirm the "Withdrawal" section renders the eligible/not-eligible/history states correctly against whatever the dev backend returns (or confirm the loading/empty-state renders cleanly if the withdrawal endpoints aren't live in your dev backend yet — note that in the PR description).

- [ ] **Step 7: Commit**

```bash
git add components/manage/billing/WithdrawalPanel.tsx components/manage/danger/EventWithdrawalSection.tsx "app/(app)/(event)/events/[eventId]/manage/DangerZoneTab.tsx" messages/en.json messages/el.json
git commit -m "feat(billing): add host withdrawal panel, replacing the refund request panel"
```

---

### Task 7: Admin withdrawal — hooks

**Files:**
- Modify: `hooks/useAdmin.ts:300-329`

- [ ] **Step 1: Check current imports and `adminKeys`**

Confirm `adminKeys.refundRequests` exists near the top of `hooks/useAdmin.ts` (it mirrors the pattern of `adminKeys.metrics` etc.) — add `withdrawals` alongside it:
```ts
    refundRequests: ['admin', 'refund-requests'] as const,
```
Add directly after it:
```ts
    withdrawals: ['admin', 'withdrawals'] as const,
```
(If the exact literal differs from this guess, match the existing `adminKeys.refundRequests` value's shape exactly — same array-of-strings pattern used throughout `adminKeys`.)

- [ ] **Step 2: Add the three withdrawal admin hooks**

Add these after the existing `useDecideRefundRequest` (`hooks/useAdmin.ts:300-329`), keeping the old two functions in place for now (deleted in Task 10):

```ts
// GET /api/admin/withdrawals — the queue of HELD requests, each with the full
// facts sheet the automated decision was based on (guide §9).
export function useAdminWithdrawals() {
    return useQuery({
        queryKey: adminKeys.withdrawals,
        queryFn: () => api.get<WithdrawalAdminDto[]>(endpoints.admin.withdrawals.list),
    });
}

// POST /api/admin/withdrawals/{id}/release — no body. Refunds at the price
// computed at request time and deletes the event, same outcome as an automatic
// REFUNDED. 409 WITHDRAWAL_NOT_HELD if the request isn't currently HELD.
export function useReleaseWithdrawal() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (requestId: string) => api.post<WithdrawalResponseDto>(endpoints.admin.withdrawals.release(requestId)),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: adminKeys.withdrawals });
            queryClient.invalidateQueries({ queryKey: ['events'] });
            queryClient.invalidateQueries({ queryKey: ['billing'] });
            queryClient.invalidateQueries({ queryKey: adminKeys.metrics });
        },
    });
}

// POST /api/admin/withdrawals/{id}/withhold — note is required and shown to the
// host verbatim. Also suspends the host's account — not a soft decline.
export function useWithholdWithdrawal() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ requestId, note }: { requestId: string; note: string }) => {
            const body: WithdrawalWithholdRequestDto = { note };
            return api.post<WithdrawalResponseDto>(endpoints.admin.withdrawals.withhold(requestId), body);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: adminKeys.withdrawals });
            queryClient.invalidateQueries({ queryKey: ['events'] });
        },
    });
}
```

- [ ] **Step 3: Update the type import block**

Add `WithdrawalAdminDto`, `WithdrawalResponseDto`, `WithdrawalWithholdRequestDto` to whatever `import type { ... } from '@/lib/api/types';` block already brings in `RefundRequestAdminDto`, `RefundRequestResponseDto`, `RefundDecisionRequestDto` in `hooks/useAdmin.ts`.

- [ ] **Step 4: Verify and commit**

```bash
npx tsc --noEmit -p .
npx eslint hooks/useAdmin.ts
git add hooks/useAdmin.ts
git commit -m "feat(billing): add admin withdrawal queue/release/withhold hooks"
```

---

### Task 8: Admin withdrawal — UI

**Files:**
- Modify: `components/admin/RefundEvidence.tsx` → rename to `components/admin/AdminEvidenceTile.tsx`
- Create: `components/admin/WithdrawalRow.tsx`
- Create: `components/admin/WithdrawalQueuePanel.tsx`
- Modify: `components/admin/AdminConsole.tsx`
- Modify: `components/admin/AdminNavigationContext.tsx`
- Modify: `components/admin/AdminShellNav.tsx`
- Modify: `components/admin/PlatformNeedsAttention.tsx`
- Modify: `messages/en.json`, `messages/el.json`

- [ ] **Step 1: Rename `RefundEvidence.tsx` to `AdminEvidenceTile.tsx`**

This component has no refund-specific content (just a label/value tile) — rename it so it isn't stale once the refund queue is gone.

```bash
git mv components/admin/RefundEvidence.tsx components/admin/AdminEvidenceTile.tsx
```

Update its export name inside the file:
```tsx
import { cn } from '@/lib/utils';

export function AdminEvidenceTile({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
    return (
        <div className="min-w-0">
            <p className={cn('truncate text-sm font-semibold tabular-nums', muted ? 'text-ink-muted' : 'text-ink')} title={value}>
                {value}
            </p>
            <p className="text-[11px] leading-tight text-ink-muted">{label}</p>
        </div>
    );
}
```

(`RefundRow.tsx`'s import of it is replaced in Step 2 below via the new `WithdrawalRow.tsx`; the old `RefundRow.tsx` is deleted in Task 10.)

- [ ] **Step 2: Write `WithdrawalRow.tsx`**

Mirrors `RefundRow.tsx`'s layout, but against `WithdrawalAdminDto`: shows the fraud signals list (every signal, fired or not) and the `recommendation` text instead of the old six usage-count tiles, and release/withhold instead of approve/reject.

```tsx
'use client';

import { AlertTriangle, Check, Layers3, PackageMinus, X } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { type ChangeEvent, useCallback, useState } from 'react';

import { AdminEvidenceTile } from '@/components/admin/AdminEvidenceTile';
import { AdminIdentifier } from '@/components/admin/AdminIdentifier';
import { useAdminNavigation } from '@/components/admin/AdminNavigationContext';
import { ConfirmActionModal } from '@/components/ui/ConfirmActionModal';
import { useReleaseWithdrawal, useWithholdWithdrawal } from '@/hooks/useAdmin';
import { adminErrorMessageKey } from '@/lib/adminUtils';
import type { WithdrawalAdminDto } from '@/lib/api/types';
import { formatOptionalMoney } from '@/lib/billing';
import { cn } from '@/lib/utils';

function formatDate(value: string | null, fallback: string): string {
    return value ? new Date(value).toLocaleString() : fallback;
}

export function WithdrawalRow({ row }: { row: WithdrawalAdminDto }) {
    const t = useTranslations('AdminPage');
    const tCommon = useTranslations('Common');
    const locale = useLocale();
    const { sendTo } = useAdminNavigation();
    const release = useReleaseWithdrawal();
    const withhold = useWithholdWithdrawal();
    const [note, setNote] = useState('');
    const [confirming, setConfirming] = useState<'release' | 'withhold' | null>(null);

    const handleNoteChange = useCallback((event: ChangeEvent<HTMLTextAreaElement>) => setNote(event.target.value), []);
    const askRelease = useCallback(() => setConfirming('release'), []);
    const askWithhold = useCallback(() => setConfirming('withhold'), []);
    const cancelConfirm = useCallback(() => setConfirming(null), []);

    const { request } = row;
    const held = request.status === 'HELD';
    const amount = formatOptionalMoney(request.totalRefundMinor, request.currency, locale);
    const isPending = release.isPending || withhold.isPending;
    const error = release.error ?? withhold.error;
    // Withholding is required to carry a note — it is the host's entire answer and
    // it also suspends their account, so an empty note is never acceptable.
    const withholdBlocked = !note.trim();

    const handleSendToAssignments = useCallback(
        () => sendTo('assignments', { eventId: request.eventId }),
        [request.eventId, sendTo]
    );
    const handleSendToPaidServices = useCallback(
        () => sendTo('paidServices', { eventId: request.eventId }),
        [request.eventId, sendTo]
    );

    const run = useCallback(
        async (decision: 'release' | 'withhold') => {
            if (decision === 'release') await release.mutateAsync(request.id);
            else await withhold.mutateAsync({ requestId: request.id, note: note.trim() });
            setConfirming(null);
        },
        [note, release, request.id, withhold]
    );

    const runConfirmed = useCallback(async () => {
        if (confirming) await run(confirming);
    }, [confirming, run]);

    return (
        <article className="border-b border-border py-5 last:border-b-0">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                        <span
                            className={cn(
                                'rounded-full px-2 py-0.5 text-[11px] font-bold',
                                held ? 'bg-status-warn-wash text-status-warn' : 'bg-surface-muted text-ink-muted'
                            )}
                        >
                            {t(`withdrawals.status.${request.status}`)}
                        </span>
                    </div>
                    {request.reason && <p className="mt-1 whitespace-pre-line text-xs text-ink-muted">{request.reason}</p>}
                </div>
                <div className="text-right">
                    <p className="text-sm font-semibold tabular-nums text-ink">{amount ?? t('withdrawals.noAmount')}</p>
                    <p className="text-[11px] text-ink-muted">{t('withdrawals.requestedAt', { date: new Date(request.createdAt).toLocaleString() })}</p>
                </div>
            </div>

            <p className="mt-3 text-sm leading-6 text-ink">{row.recommendation}</p>

            <div className="mt-3 grid grid-cols-1 gap-2 border-t border-border pt-3 sm:grid-cols-2">
                {row.fraudSignals.map((signal) => (
                    <AdminEvidenceTile
                        key={signal.code}
                        label={`${signal.code}${signal.fired ? ` · ${t('withdrawals.signalFired')}` : ''}`}
                        value={signal.observed}
                        muted={!signal.fired}
                    />
                ))}
            </div>

            <div className="mt-3 grid gap-3 border-t border-border pt-3 sm:grid-cols-2">
                <AdminIdentifier label={t('identifiers.eventId')} value={request.eventId} />
                <AdminIdentifier label={t('identifiers.requestId')} value={request.id} />
            </div>

            <div className="mt-2 flex flex-wrap gap-3 text-xs font-semibold text-ink-muted">
                <button type="button" onClick={handleSendToAssignments} className="inline-flex items-center gap-1.5 hover:text-ink hover:underline">
                    <Layers3 className="h-3.5 w-3.5" />
                    {t('withdrawals.sendToAssignments')}
                </button>
                <button type="button" onClick={handleSendToPaidServices} className="inline-flex items-center gap-1.5 hover:text-ink hover:underline">
                    <PackageMinus className="h-3.5 w-3.5" />
                    {t('withdrawals.sendToPaidServices')}
                </button>
            </div>

            {!held && (
                <p className="mt-3 text-xs text-ink-muted">
                    {t(`withdrawals.status.${request.status}`)}
                    {request.decidedAt ? ` • ${formatDate(request.decidedAt, '')}` : ''}
                    {request.decisionNote ? ` — ${request.decisionNote}` : ''}
                </p>
            )}

            {held && (
                <div className="mt-3 border-t border-border pt-3">
                    <label className="text-xs font-semibold text-ink" htmlFor={`note-${request.id}`}>
                        {t('withdrawals.noteLabel')}{' '}
                        <span className="text-ink-faint">({withholdBlocked ? t('withdrawals.noteRequiredForWithhold') : tCommon('optional')})</span>
                    </label>
                    <p className="text-[11px] text-ink-muted">{t('withdrawals.noteHint')}</p>
                    <textarea
                        id={`note-${request.id}`}
                        value={note}
                        onChange={handleNoteChange}
                        rows={2}
                        maxLength={1000}
                        className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-ink"
                    />

                    <div className="mt-2 flex flex-wrap items-center gap-2">
                        <button
                            type="button"
                            onClick={askRelease}
                            disabled={isPending}
                            className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-ink px-4 text-sm font-semibold text-white disabled:opacity-40"
                        >
                            <Check className="h-4 w-4" />
                            {t('withdrawals.release')}
                        </button>
                        <button
                            type="button"
                            onClick={askWithhold}
                            disabled={isPending || withholdBlocked}
                            title={withholdBlocked ? t('withdrawals.noteRequiredHint') : undefined}
                            className="inline-flex min-h-9 items-center gap-1.5 rounded-full px-4 text-sm font-semibold text-ink ring-1 ring-border disabled:opacity-40"
                        >
                            <X className="h-4 w-4" />
                            {t('withdrawals.withhold')}
                        </button>
                        {withholdBlocked && <span className="text-[11px] text-ink-muted">{t('withdrawals.noteRequiredHint')}</span>}
                    </div>

                    {error && <p className="mt-2 text-xs text-status-danger">{t(`errors.${adminErrorMessageKey(error)}`)}</p>}
                </div>
            )}

            <ConfirmActionModal
                open={confirming !== null}
                onCloseAction={cancelConfirm}
                icon={confirming === 'withhold' ? <AlertTriangle className="h-5 w-5" /> : undefined}
                title={confirming === 'release' ? t('withdrawals.releaseConfirmTitle') : t('withdrawals.withholdConfirmTitle')}
                body={confirming === 'release' ? t('withdrawals.confirmRelease') : t('withdrawals.confirmWithhold')}
                cancelLabel={t('withdrawals.cancel')}
                confirmLabel={t('withdrawals.confirmYes')}
                isConfirming={isPending}
                onConfirmAction={runConfirmed}
                tone={confirming === 'withhold' ? 'danger' : 'default'}
            />
        </article>
    );
}
```

- [ ] **Step 3: Write `WithdrawalQueuePanel.tsx`**

Same shape as `RefundQueuePanel.tsx`, filtering on `HELD` instead of `PENDING` (the queue is *only* held requests per the guide — `useAdminWithdrawals` already returns only `HELD` rows, so this panel has no "all" filter, just the list):

```tsx
'use client';

import { RefreshCw } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useCallback } from 'react';

import { WithdrawalRow } from '@/components/admin/WithdrawalRow';
import { LoadingState } from '@/components/ui/LoadingState';
import { useAdminWithdrawals } from '@/hooks/useAdmin';
import { adminErrorMessageKey } from '@/lib/adminUtils';

export function WithdrawalQueuePanel() {
    const t = useTranslations('AdminPage');
    const query = useAdminWithdrawals();

    const handleRefresh = useCallback(() => {
        query.refetch();
    }, [query]);

    const rows = query.data ?? [];

    return (
        <section className="space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border pb-4">
                <div className="min-w-0">
                    <h2 className="text-xl font-semibold tracking-tight text-ink">{t('withdrawals.title')}</h2>
                    <p className="mt-1 max-w-2xl text-sm leading-6 text-ink-muted">{t('withdrawals.subtitle')}</p>
                </div>
                <button
                    type="button"
                    onClick={handleRefresh}
                    disabled={query.isFetching}
                    className="inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-full bg-transparent px-3 text-xs font-semibold text-ink-muted ring-1 ring-border disabled:opacity-50"
                >
                    <RefreshCw className={query.isFetching ? 'h-3.5 w-3.5 animate-spin' : 'h-3.5 w-3.5'} />
                    {t('billingOps.refresh')}
                </button>
            </div>

            {query.isLoading && <LoadingState label={t('withdrawals.loading')} />}
            {query.error && <p className="text-sm text-status-danger">{t(`errors.${adminErrorMessageKey(query.error)}`)}</p>}
            {!query.isLoading && !query.error && rows.length === 0 && <p className="py-3 text-sm text-ink-muted">{t('withdrawals.empty')}</p>}

            <div>
                {rows.map((row) => (
                    <WithdrawalRow key={row.request.id} row={row} />
                ))}
            </div>
        </section>
    );
}
```

- [ ] **Step 4: Rewire `AdminConsole.tsx`**

Replace:
```ts
import { RefundQueuePanel } from '@/components/admin/RefundQueuePanel';
```
with:
```ts
import { WithdrawalQueuePanel } from '@/components/admin/WithdrawalQueuePanel';
```
and:
```tsx
                {tab === 'refunds' && <RefundQueuePanel />}
```
with:
```tsx
                {tab === 'withdrawals' && <WithdrawalQueuePanel />}
```

- [ ] **Step 5: Rewire `AdminNavigationContext.tsx`**

Rename `refunds` → `withdrawals` in all four places: the `AdminTab` union, `HASH_TO_TAB`/`TAB_TO_HASH` (`'#withdrawals': 'withdrawals'`), and the `tabs` array entry (`{ key: 'withdrawals', label: t('withdrawals'), icon: Undo2 }`).

- [ ] **Step 6: Rewire `AdminShellNav.tsx`**

In `TAB_GROUP`, replace `refunds: 'operations',` with `withdrawals: 'operations',`.

- [ ] **Step 7: Rewire `PlatformNeedsAttention.tsx`**

Replace:
```ts
import { useAdminRefundRequests, useUnprocessedWebhooks } from '@/hooks/useAdmin';
```
with:
```ts
import { useAdminWithdrawals, useUnprocessedWebhooks } from '@/hooks/useAdmin';
```
Replace:
```ts
    const refundsQuery = useAdminRefundRequests();
```
```ts
    const pendingRefunds = (refundsQuery.data ?? []).filter((row) => row.request.status === 'PENDING').length;
    const unprocessedWebhooks = (webhooksQuery.data ?? []).length;
    const loading = refundsQuery.isLoading || webhooksQuery.isLoading;
    const clear = pendingRefunds === 0 && unprocessedWebhooks === 0;
```
with:
```ts
    const withdrawalsQuery = useAdminWithdrawals();
```
```ts
    const heldWithdrawals = (withdrawalsQuery.data ?? []).length;
    const unprocessedWebhooks = (webhooksQuery.data ?? []).length;
    const loading = withdrawalsQuery.isLoading || webhooksQuery.isLoading;
    const clear = heldWithdrawals === 0 && unprocessedWebhooks === 0;
```
And in the JSX:
```tsx
                    {pendingRefunds > 0 && (
                        <PlatformQueueCallout
                            label={t('metrics.pendingRefunds')}
                            count={pendingRefunds}
                            action={t('metrics.openQueue')}
                            icon={Undo2}
                            onOpen={openTab('refunds')}
                        />
                    )}
```
with:
```tsx
                    {heldWithdrawals > 0 && (
                        <PlatformQueueCallout
                            label={t('metrics.heldWithdrawals')}
                            count={heldWithdrawals}
                            action={t('metrics.openQueue')}
                            icon={Undo2}
                            onOpen={openTab('withdrawals')}
                        />
                    )}
```

- [ ] **Step 8: Add translations**

In `messages/en.json`, under `AdminPage.tabs`, replace `"refunds": "Refunds"` with `"withdrawals": "Withdrawals"`.

Under `AdminPage.metrics`, replace `"attentionClear"`, `"pendingRefunds"` with:
```json
    "attentionClear": "Nothing pending. No withdrawals awaiting review, no unprocessed webhooks.",
    "heldWithdrawals": "Withdrawals awaiting review",
```
(keep `unprocessedWebhooks`/`openQueue` unchanged).

Add a new `withdrawals` block under `AdminPage`, replacing `refunds` (removed Task 10):
```json
  "withdrawals": {
    "title": "Withdrawals",
    "subtitle": "These were held for a fraud signal (or manual mode). Decide from the facts sheet, not the reason alone.",
    "loading": "Loading withdrawals…",
    "empty": "Nothing held for review.",
    "noAmount": "No amount recorded",
    "requestedAt": "Requested {date}",
    "signalFired": "fired",
    "sendToAssignments": "Change this event's plan",
    "sendToPaidServices": "Remove an entitlement",
    "noteLabel": "Decision note",
    "noteHint": "This note is sent to the host.",
    "noteRequiredForWithhold": "required to withhold",
    "noteRequiredHint": "Withholding needs a note — the host is told only what you write here.",
    "release": "Release",
    "withhold": "Withhold",
    "cancel": "Cancel",
    "confirmYes": "Confirm",
    "releaseConfirmTitle": "Release this withdrawal?",
    "withholdConfirmTitle": "Withhold this withdrawal?",
    "confirmRelease": "This refunds the request at the price computed when it was filed and takes the event offline. Continue?",
    "confirmWithhold": "This refuses the withdrawal and suspends the host's account. Continue?",
    "status": {
      "HELD": "Held",
      "REFUNDED": "Refunded",
      "WITHHELD": "Withheld"
    }
  }
```

In `messages/el.json`, mirror the same structure:
- `AdminPage.tabs.withdrawals`: `"Αποσύρσεις"`
- `AdminPage.metrics.attentionClear`: `"Δεν εκκρεμεί τίποτα. Καμία απόσυρση υπό εξέταση, κανένα ανεπεξέργαστο webhook."`
- `AdminPage.metrics.heldWithdrawals`: `"Αποσύρσεις υπό εξέταση"`
- `AdminPage.withdrawals`:
```json
  "withdrawals": {
    "title": "Αποσύρσεις",
    "subtitle": "Αυτές κρατήθηκαν λόγω ένδειξης απάτης (ή χειροκίνητης λειτουργίας). Αποφασίστε με βάση τα στοιχεία, όχι μόνο την αιτιολογία.",
    "loading": "Φόρτωση αποσύρσεων…",
    "empty": "Καμία απόσυρση υπό εξέταση.",
    "noAmount": "Χωρίς καταχωρισμένο ποσό",
    "requestedAt": "Υποβλήθηκε {date}",
    "signalFired": "ενεργοποιήθηκε",
    "sendToAssignments": "Αλλαγή πλάνου εκδήλωσης",
    "sendToPaidServices": "Αφαίρεση παροχής",
    "noteLabel": "Σημείωση απόφασης",
    "noteHint": "Η σημείωση αποστέλλεται στον διοργανωτή.",
    "noteRequiredForWithhold": "απαιτείται για απόρριψη",
    "noteRequiredHint": "Η απόρριψη χρειάζεται σημείωση — ο διοργανωτής βλέπει μόνο όσα γράψετε εδώ.",
    "release": "Απελευθέρωση",
    "withhold": "Απόρριψη",
    "cancel": "Ακύρωση",
    "confirmYes": "Επιβεβαίωση",
    "releaseConfirmTitle": "Απελευθέρωση αυτής της απόσυρσης;",
    "withholdConfirmTitle": "Απόρριψη αυτής της απόσυρσης;",
    "confirmRelease": "Θα γίνει επιστροφή χρημάτων στην τιμή που υπολογίστηκε κατά την υποβολή και η εκδήλωση θα αποσυρθεί. Συνέχεια;",
    "confirmWithhold": "Αυτό απορρίπτει την απόσυρση και αναστέλλει τον λογαριασμό του διοργανωτή. Συνέχεια;",
    "status": {
      "HELD": "Υπό εξέταση",
      "REFUNDED": "Επιστράφηκε",
      "WITHHELD": "Απορρίφθηκε"
    }
  }
```

- [ ] **Step 9: Verify**

```bash
npx tsc --noEmit -p .
npx eslint components/admin/AdminEvidenceTile.tsx components/admin/WithdrawalRow.tsx components/admin/WithdrawalQueuePanel.tsx components/admin/AdminConsole.tsx components/admin/AdminNavigationContext.tsx components/admin/AdminShellNav.tsx components/admin/PlatformNeedsAttention.tsx
```

- [ ] **Step 10: Manually verify in the browser**

As an admin, open `/admin#withdrawals`. Confirm the sidebar shows "Withdrawals" (not "Refunds"), the panel renders its own empty/loading state, and `PlatformNeedsAttention` on the metrics tab shows "held" count instead of "pending refunds" (or the clear state if there are none).

- [ ] **Step 11: Commit**

```bash
git add components/admin/AdminEvidenceTile.tsx components/admin/WithdrawalRow.tsx components/admin/WithdrawalQueuePanel.tsx components/admin/AdminConsole.tsx components/admin/AdminNavigationContext.tsx components/admin/AdminShellNav.tsx components/admin/PlatformNeedsAttention.tsx messages/en.json messages/el.json
git commit -m "feat(billing): add admin withdrawal queue, replacing the refund-request queue"
```

---

### Task 9: Notifications — swap billing notification types

**Files:**
- Modify: `lib/api/types.ts` (`BillingNotificationType`, added in Task 1's file but this specific type lives near the notifications section — see below)
- Modify: `lib/notifications.ts`
- Modify: `components/notifications/NotificationSeverityIcon.tsx`

- [ ] **Step 1: Find and replace `BillingNotificationType`**

Search `lib/api/types.ts` for `export type BillingNotificationType`. Replace:
```ts
export type BillingNotificationType = 'REFUND_APPROVED' | 'REFUND_REJECTED';
```
with:
```ts
// BREAKING 2026-09-18: REFUND_APPROVED/REFUND_REJECTED replaced by the three
// WITHDRAWAL_* types — nothing emits the old pair any more (billing-fe-guide §10).
export type BillingNotificationType = 'WITHDRAWAL_REFUNDED' | 'WITHDRAWAL_HELD' | 'WITHDRAWAL_WITHHELD';
```

- [ ] **Step 2: Update `lib/notifications.ts`**

Replace:
```ts
const BILLING_TYPES: readonly string[] = ['REFUND_APPROVED', 'REFUND_REJECTED'] satisfies readonly BillingNotificationType[];
```
with:
```ts
const BILLING_TYPES: readonly string[] = [
    'WITHDRAWAL_REFUNDED',
    'WITHDRAWAL_HELD',
    'WITHDRAWAL_WITHHELD',
] satisfies readonly BillingNotificationType[];
```

Replace:
```ts
export function notificationSeverity(notification: NotificationResponseDto): NotificationSeverity {
    if (notification.severity) return notification.severity;
    if (notification.type === 'REFUND_APPROVED') return 'CRITICAL';
    return 'INFO';
}
```
with:
```ts
export function notificationSeverity(notification: NotificationResponseDto): NotificationSeverity {
    if (notification.severity) return notification.severity;
    // Both report the event disappearing/the host losing standing — give them the
    // same weight the old REFUND_APPROVED had. WITHDRAWAL_HELD changes nothing yet,
    // so it stays INFO via the fallback below.
    if (notification.type === 'WITHDRAWAL_REFUNDED' || notification.type === 'WITHDRAWAL_WITHHELD') return 'CRITICAL';
    return 'INFO';
}
```

- [ ] **Step 3: Update `NotificationSeverityIcon.tsx`**

Replace:
```tsx
export function NotificationSeverityIcon({ notification }: { notification: NotificationResponseDto }) {
    const severity = notificationSeverity(notification);
    if (!isBillingNotification(notification)) return <Bell className="h-2.5 w-2.5" strokeWidth={2} />;
    if (notification.type === 'REFUND_REJECTED') return <XCircle className="h-2.5 w-2.5" strokeWidth={2} />;
    if (severity === 'INFO') return <CreditCard className="h-2.5 w-2.5" strokeWidth={2} />;
    return <AlertTriangle className="h-2.5 w-2.5" strokeWidth={2} />;
}
```
with:
```tsx
export function NotificationSeverityIcon({ notification }: { notification: NotificationResponseDto }) {
    const severity = notificationSeverity(notification);
    if (!isBillingNotification(notification)) return <Bell className="h-2.5 w-2.5" strokeWidth={2} />;
    if (notification.type === 'WITHDRAWAL_WITHHELD') return <XCircle className="h-2.5 w-2.5" strokeWidth={2} />;
    if (severity === 'INFO') return <CreditCard className="h-2.5 w-2.5" strokeWidth={2} />;
    return <AlertTriangle className="h-2.5 w-2.5" strokeWidth={2} />;
}
```

- [ ] **Step 4: Verify and commit**

```bash
npx tsc --noEmit -p .
npx eslint lib/notifications.ts components/notifications/NotificationSeverityIcon.tsx
git add lib/api/types.ts lib/notifications.ts components/notifications/NotificationSeverityIcon.tsx
git commit -m "feat(billing): swap REFUND_APPROVED/REFUND_REJECTED for the three WITHDRAWAL_* notification types"
```

---

### Task 10: Error codes

**Files:**
- Modify: `lib/api/errors.ts`
- Modify: `lib/api/errorMessageKeys.ts`
- Modify: `lib/adminUtils.ts`
- Modify: `messages/en.json`, `messages/el.json`

- [ ] **Step 1: Update `ERROR_CODES` in `lib/api/errors.ts`**

Replace:
```ts
    REFUND_NOT_ELIGIBLE: 5022,
    REFUND_ALREADY_REQUESTED: 5023,
    REFUND_REQUEST_NOT_PENDING: 5024,
    ORDER_NOT_REFUNDABLE: 5025,
```
with nothing (delete these four lines — nothing produces these codes any more per the guide, and nothing in the FE should branch on them going forward).

Add these four, near `EVENT_HOST_TRANSFER_NOT_PRIMARY_HOST: 4004,` at the end of the object:
```ts
    EVENT_WITHDRAWN: 5071,
    WITHDRAWAL_TERMS_VERSION_STALE: 5072,
    WITHDRAWAL_REFUSED: 5073,
    WITHDRAWAL_NOT_HELD: 5074,
```

- [ ] **Step 2: Update `lib/api/errorMessageKeys.ts`**

Remove `'refundAlreadyRequested'`, `'refundNotEligible'`, `'refundNotPending'`, `'orderNotRefundable'` from the `ApiErrorMessageKey` union, and their three `[ERROR_CODES...]: '...'` mapping lines:
```ts
    [ERROR_CODES.ORDER_NOT_REFUNDABLE]: 'orderNotRefundable',
```
```ts
    [ERROR_CODES.REFUND_ALREADY_REQUESTED]: 'refundAlreadyRequested',
    [ERROR_CODES.REFUND_NOT_ELIGIBLE]: 'refundNotEligible',
    [ERROR_CODES.REFUND_REQUEST_NOT_PENDING]: 'refundNotPending',
```

Add `'eventWithdrawn' | 'withdrawalTermsVersionStale' | 'withdrawalRefused'` to the union (`withdrawalNotHeld` is admin-only, handled by `adminUtils.ts` instead — this file is for host-facing `useApiErrorMessage`), and:
```ts
    [ERROR_CODES.EVENT_WITHDRAWN]: 'eventWithdrawn',
    [ERROR_CODES.WITHDRAWAL_TERMS_VERSION_STALE]: 'withdrawalTermsVersionStale',
    [ERROR_CODES.WITHDRAWAL_REFUSED]: 'withdrawalRefused',
```

- [ ] **Step 3: Update `lib/adminUtils.ts`**

Remove `'refundNotPending' | 'refundNotEligible' | 'orderNotRefundable'` from `AdminErrorMessageKey`, and their three `if` branches in `adminErrorMessageKey`:
```ts
    if (code === ERROR_CODES.REFUND_REQUEST_NOT_PENDING) return 'refundNotPending';
    if (code === ERROR_CODES.REFUND_NOT_ELIGIBLE) return 'refundNotEligible';
    if (code === ERROR_CODES.ORDER_NOT_REFUNDABLE) return 'orderNotRefundable';
```

Add `'withdrawalNotHeld'` to the union, and:
```ts
    if (code === ERROR_CODES.WITHDRAWAL_NOT_HELD) return 'withdrawalNotHeld';
```
right after the existing `if (code === ERROR_CODES.RESOURCE_NOT_FOUND) return 'notFound';` line (admin release/withhold guard, mirrors the old `REFUND_REQUEST_NOT_PENDING` case it replaces).

- [ ] **Step 4: Add translations**

In `messages/en.json` under `ApiErrors`, remove `refundNotEligible`, `refundAlreadyRequested`, `orderNotRefundable`, `refundNotPending`, and add:
```json
  "eventWithdrawn": "This event's deletion can't be cancelled — it was withdrawn and closed permanently.",
  "withdrawalTermsVersionStale": "These terms were updated. Review them again and try again.",
  "withdrawalRefused": "This event doesn't currently qualify for a withdrawal."
```

In `messages/en.json` under `AdminPage.errors`, remove `refundNotPending`, `refundNotEligible`, `orderNotRefundable`, and add:
```json
  "withdrawalNotHeld": "This request was already decided — refresh the queue to see the current state."
```

Mirror both changes in `messages/el.json`:
- `ApiErrors` additions:
```json
  "eventWithdrawn": "Η διαγραφή αυτής της εκδήλωσης δεν μπορεί να ακυρωθεί — αποσύρθηκε και έκλεισε οριστικά.",
  "withdrawalTermsVersionStale": "Οι όροι ενημερώθηκαν. Ελέγξτε τους ξανά και δοκιμάστε πάλι.",
  "withdrawalRefused": "Αυτή η εκδήλωση δεν πληροί επί του παρόντος τις προϋποθέσεις υπαναχώρησης."
```
- `AdminPage.errors` addition:
```json
  "withdrawalNotHeld": "Αυτό το αίτημα έχει ήδη κριθεί — ανανεώστε την ουρά για την τρέχουσα κατάσταση."
```

- [ ] **Step 5: Verify and commit**

```bash
npx tsc --noEmit -p .
npx eslint lib/api/errors.ts lib/api/errorMessageKeys.ts lib/adminUtils.ts
git add lib/api/errors.ts lib/api/errorMessageKeys.ts lib/adminUtils.ts messages/en.json messages/el.json
git commit -m "feat(billing): add withdrawal error codes, remove dead refund error codes"
```

---

### Task 11: Cleanup — delete the old refund flow

Everything below is now unreferenced. This task deletes it in one pass and runs a final sweep to confirm nothing is left dangling.

**Files:**
- Delete: `hooks/useEventRefundFlow.ts`
- Delete: `components/manage/billing/BillingRefundPanel.tsx`
- Delete: `components/manage/danger/EventRefundSection.tsx`
- Delete: `components/admin/RefundQueuePanel.tsx`
- Delete: `components/admin/RefundRow.tsx`
- Modify: `hooks/useBilling.ts` (remove `useRefundEligibility`, `useEventRefundRequests`, `useRequestRefund`, and their now-unused type imports)
- Modify: `hooks/useAdmin.ts` (remove `useAdminRefundRequests`, `useDecideRefundRequest`, `adminKeys.refundRequests`, and their now-unused type imports)
- Modify: `lib/api/types.ts` (remove `RefundRequestStatus`, `RefundEligibilityResponseDto`, `RefundRequestResponseDto`, `RefundRequestAdminDto`, `RefundDecisionRequestDto`)
- Modify: `lib/api/endpoints.ts` (remove `events.refundEligibility`, `events.refundRequests`, `admin.refundRequests`)
- Modify: `messages/en.json`, `messages/el.json` (remove `EventPlanSettingsPage.refund`, `.refundStatus`, `ManagePage.sections.refund`, `AdminPage.refunds`)

- [ ] **Step 1: Delete the dead files**

```bash
git rm hooks/useEventRefundFlow.ts components/manage/billing/BillingRefundPanel.tsx components/manage/danger/EventRefundSection.tsx components/admin/RefundQueuePanel.tsx components/admin/RefundRow.tsx
```

- [ ] **Step 2: Remove the three dead hooks from `hooks/useBilling.ts`**

Delete `useRefundEligibility`, `useEventRefundRequests`, and `useRequestRefund` in their entirety. Remove `RefundEligibilityResponseDto` and `RefundRequestResponseDto` from the `import type { ... } from '@/lib/api/types';` block at the top of the file (everything else in that block stays).

- [ ] **Step 3: Remove the two dead hooks from `hooks/useAdmin.ts`**

Delete `useAdminRefundRequests` and `useDecideRefundRequest` in their entirety, and the `refundRequests` entry from `adminKeys`. Remove `RefundRequestAdminDto`, `RefundRequestResponseDto`, `RefundDecisionRequestDto` from its type import block.

- [ ] **Step 4: Remove the five dead types from `lib/api/types.ts`**

Delete `RefundRequestStatus`, `RefundEligibilityResponseDto`, `RefundRequestResponseDto`, the `// --- Admin billing operations (billing-fe-guide §13) ---` comment and `RefundRequestAdminDto` under it, and `RefundDecisionRequestDto`.

- [ ] **Step 5: Remove the three dead endpoint groups from `lib/api/endpoints.ts`**

Delete the `refundEligibility` and `refundRequests` lines from the `events` block, and the `refundRequests: { list, approve, reject }` block from `admin`.

- [ ] **Step 6: Remove dead translation keys**

From `messages/en.json` and `messages/el.json`: delete `EventPlanSettingsPage.refund`, `EventPlanSettingsPage.refundStatus`, `ManagePage.sections.refund`, `AdminPage.refunds`.

- [ ] **Step 7: Sweep for anything left over**

```bash
grep -rniE "refund" --include="*.ts" --include="*.tsx" --include="*.json" . | grep -v node_modules | grep -v ".claude/worktrees" | grep -v "docs/integration guides"
```
Expected: no output (the integration-guides docs directory is historical reference material and is excluded on purpose — it documents the migration itself and should keep saying "refund" where it's describing the old flow being replaced).

- [ ] **Step 8: Full verification**

```bash
npx tsc --noEmit -p .
npx eslint .
npx vitest run
```
Expected: no errors, no failing tests (this migration touches no files with existing test coverage, so the existing suite should be unaffected — this run just confirms that).

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "chore(billing): remove the dead admin-approved refund flow, replaced by withdrawal"
```

---

### Task 12: End-to-end manual verification

**Files:** none — verification only, per this repo's CLAUDE.md UI-change rule.

- [ ] **Step 1: Start the dev server and confirm the app boots clean**

```bash
npm run dev
```
Check `preview_logs`/terminal output for build errors before proceeding.

- [ ] **Step 2: Host flow — activation**

As a host, open a `DRAFT` event with a `startAt` set → manage/overview tab. Click "Pay and Publish" → confirm it lands on `/events/{id}/checkout/review?intent=activation` (not a direct redirect to a payment provider) → confirm the withdrawal consent section renders, both checkboxes gate the submit button, and the order preview title reads "Order preview" (not "Payment cancelled").

- [ ] **Step 3: Host flow — upgrade**

On an `ACTIVE` event, start a plan upgrade → confirm the same consent section renders on its review page and gates submission the same way.

- [ ] **Step 4: Host flow — withdrawal panel**

On an `ACTIVE` event's manage → danger zone tab, confirm the "Withdrawal" section (previously "Refund") renders without crashing, in whatever state the dev backend's `withdrawal-preview`/`withdrawals` endpoints currently return (eligible, not-eligible, or a prior decision).

- [ ] **Step 5: Admin flow**

As an admin, open `/admin#withdrawals`. Confirm the sidebar item reads "Withdrawals", the panel loads (empty state is fine if the dev backend has no held requests), and the metrics tab's "needs attention" callout reflects the held count instead of pending refunds.

- [ ] **Step 6: Responsive check**

Resize to mobile width (375px) and confirm the consent checkboxes and the withdrawal panel don't overlap or clip text — this is host-facing UI, which this repo's CLAUDE.md requires to be mobile-first.

- [ ] **Step 7: Take a screenshot of each of the three surfaces (checkout consent, host withdrawal panel, admin withdrawal queue) for the PR description.**

- [ ] **Step 8: Report to the user**

Summarize what was verified and flag anything that couldn't be fully exercised because the dev backend doesn't yet implement the new withdrawal endpoints (if that's the case) — say so explicitly rather than claiming full end-to-end verification that didn't happen.

---

## Self-Review

**Spec coverage** (against `billing-fe-guide.md` §6, §7d, §9, §10, §12 and the type diffs):
- §6 checkout consent body (`requestsImmediateStart`, `acknowledgesWithdrawalTerms`, `termsVersion`) + `WITHDRAWAL_TERMS_VERSION_STALE` → Task 4.
- §7d upgrade-checkout same consent fields → Task 4 (shared code path with activation).
- §8 `setupAmountMinor`/`eventDayAmountMinor`/`hostingAmountMinor` on `OrderSummaryDto` → Task 1 (not surfaced in any UI per the guide's own note that they're "not worth rendering on this screen by themselves" — correctly left as data-only).
- §9 withdrawal-preview / POST withdrawals / GET withdrawals (host) → Tasks 1–2 (types/endpoints), 3 (hooks), 5–6 (flow hook + UI).
- §9 admin GET withdrawals / release / withhold → Tasks 1–2, 7 (hooks), 8 (UI).
- §9 `EVENT_WITHDRAWN` (5071) on cancel-deletion → Task 10 (error code + message; no dedicated UI path currently calls cancel-deletion with this specific guard beyond generic error display, which is sufficient per the guide's own suggested handling: "point the host at the download-only gallery/wishbook link instead" — flagged as a follow-up if a dedicated cancel-deletion UI exists; confirmed no such UI references refund/withdrawal error codes today).
- §10 notification type swap + `AppConfigResponseDto.withdrawal` → Tasks 1, 9.
- §12 all four new error codes + removal of the four dead ones → Task 10.
- `AppWithdrawalConfigDto` → Task 1.

**Placeholder scan:** no `TBD`/`implement later`/hand-wavy steps found on re-read; every step has complete code or an exact shell command.

**Type consistency:** `WithdrawalPreviewResponseDto`, `WithdrawalResponseDto`, `WithdrawalRequestDto`, `WithdrawalAdminDto`, `WithdrawalFraudSignalDto`, `WithdrawalWithholdRequestDto`, `AppWithdrawalConfigDto`, `WithdrawalConsentDto`, `OrderKind` are named and shaped identically everywhere they're introduced (Task 1) and consumed (Tasks 3, 5–9) — verified by re-reading each task's import lists against Task 1's definitions.

**One known follow-up, not blocking this plan:** `useAdminWithdrawals` returns only `HELD` rows per the guide's description of the admin queue ("The queue of HELD requests"), so `WithdrawalQueuePanel` has no pending/all filter toggle the way `RefundQueuePanel` did. If product wants to browse the *full* withdrawal history (not just the actionable queue) from the admin console later, that's a new, separate read — not something this migration's source endpoint supports, so it's out of scope here rather than silently dropped.
