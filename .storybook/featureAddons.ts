import type { FeatureAddons } from '@/hooks/useFeatureAddons';
import type { InvitationAddonCheckout } from '@/hooks/useInvitationAddonStep';
import type { PaidServiceResponseDto, PriceBreakdown, PriceBreakdownItem } from '@/lib/api/types';

// Feature add-ons (KAN-82) as the Add-ons page's section sees them, for stories and component tests.

function storyUnlock(code: string, name: string, moduleKey: string, priceAmountMinor: number): PaidServiceResponseDto {
    return {
        id: `svc-${code}`,
        code,
        kind: 'MODULE_UNLOCK',
        name,
        description: null,
        sortOrder: 0,
        isAssignable: true,
        isPublic: true,
        priceAmountMinor,
        priceCurrency: 'EUR',
        billingPeriod: 'ONE_TIME',
        grantsStorageBytes: null,
        grantsModuleKey: moduleKey,
        planTierIds: [],
    };
}

export const storySaveMyDateAddon = storyUnlock('SAVE_MY_DATE', 'Online invitation', 'save_my_date', 2900);
export const storyRsvpAddon = storyUnlock('RSVP', 'RSVP', 'rsvp', 900);
export const storyGalleryAddon = storyUnlock('GALLERY', 'Gallery', 'gallery', 1500);

const noop = () => {};

// The row handlers call toggle, pay and setDraftAddon, so a story or test can spy on those.
export function storyFeatureAddons(overrides: Partial<FeatureAddons> = {}): FeatureAddons {
    const settled: Pick<FeatureAddons, 'mode' | 'offers' | 'isLoading' | 'modulesFailed'> = {
        mode: 'checkout',
        offers: [storySaveMyDateAddon, storyRsvpAddon, storyGalleryAddon].map((service) => ({ service, added: false })),
        isLoading: false,
        modulesFailed: false,
        ...overrides,
    };
    const state: Omit<FeatureAddons, 'handleToggleChange' | 'handleDraftAddonClick' | 'handlePayClick'> = {
        ...settled,
        // Shown the way the hook decides it, unless a story says otherwise.
        isOffered: settled.mode !== null && !settled.isLoading && !settled.modulesFailed && settled.offers.length > 0,
        purchaseBlock: null,
        canPurchase: true,
        paused: false,
        selectedCodes: new Set(),
        pickedCount: 0,
        totalMinor: 0,
        currency: 'EUR',
        consent: {
            termsVersion: '2026-09-18',
            requestsImmediateStart: false,
            acknowledgesWithdrawalTerms: false,
            staleTerms: false,
            consentSatisfied: false,
            handleRequestsImmediateStartChange: noop,
            handleAcknowledgesWithdrawalTermsChange: noop,
            handleCheckoutError: () => false,
        },
        isPaying: false,
        canPay: false,
        pendingCode: null,
        error: null,
        toggle: noop,
        pay: async () => {},
        setDraftAddon: async () => {},
        ...overrides,
    };
    return {
        handleToggleChange: (event) => state.toggle(event.currentTarget.dataset.serviceCode ?? ''),
        handleDraftAddonClick: (event) =>
            void state.setDraftAddon(event.currentTarget.dataset.serviceCode ?? '', event.currentTarget.dataset.added !== 'true'),
        handlePayClick: () => void state.pay(),
        ...state,
        ...overrides,
    };
}

// A live event with Save my date and RSVP ticked and both boxes checked: ready to pay.
export function storyFeatureAddonsReady(overrides: Partial<FeatureAddons> = {}): FeatureAddons {
    const base = storyFeatureAddons();
    return storyFeatureAddons({
        selectedCodes: new Set([storySaveMyDateAddon.code, storyRsvpAddon.code]),
        pickedCount: 2,
        totalMinor: storySaveMyDateAddon.priceAmountMinor + storyRsvpAddon.priceAmountMinor,
        consent: { ...base.consent, requestsImmediateStart: true, acknowledgesWithdrawalTerms: true, consentSatisfied: true },
        canPay: true,
        ...overrides,
    });
}

// Publish's add-on step (KAN-82) on a live event: Save my date included, RSVP not yet ticked.
export function storyAddonStepCheckout(overrides: Partial<InvitationAddonCheckout> = {}): InvitationAddonCheckout {
    return {
        step: {
            mode: 'checkout',
            saveMyDate: { service: storySaveMyDateAddon, added: false },
            rsvp: { service: storyRsvpAddon, added: false },
        },
        rsvpTicked: false,
        handleRsvpChange: noop,
        draftItems: null,
        totalMinor: storySaveMyDateAddon.priceAmountMinor,
        currency: 'EUR',
        consent: storyFeatureAddons().consent,
        canSubmit: false,
        isPending: false,
        error: null,
        submit: (event) => event.preventDefault(),
        ...overrides,
    };
}

// A draft's activation quote without the step's add-ons: the plan and a theme it already opted into.
export function storyDraftActivationItems(): PriceBreakdown {
    const item = (overrides: Partial<PriceBreakdownItem>): PriceBreakdownItem => ({
        code: 'ACTIVATION',
        labelKey: 'billing.item.activation',
        name: 'Lite',
        listMinor: 10_000,
        discountMinor: 0,
        priceMinor: 10_000,
        withdrawal: 'RETAINED_ONCE_STARTED',
        performedAt: null,
        months: null,
        monthsAdded: null,
        paidServiceCode: null,
        planTierCode: 'LITE',
        storageBytes: null,
        ...overrides,
    });
    return {
        kind: 'ACTIVATION',
        currency: 'EUR',
        buyerType: 'CONSUMER',
        coverage: { optionId: 'cov-12', months: 12, monthsAdded: null, endsAt: null, endsAtProjected: true },
        items: [
            item({}),
            item({
                code: 'ADDON',
                labelKey: 'billing.item.addon',
                name: 'Guest book',
                listMinor: 1500,
                priceMinor: 1500,
                paidServiceCode: 'GUESTBOOK',
                planTierCode: null,
            }),
        ],
        discounts: [],
        combinedDiscountPercent: 0,
        discountCapPercent: 50,
        capApplied: false,
        listTotalMinor: 11_500,
        discountTotalMinor: 0,
        totalMinor: 11_500,
        vat: { included: true, note: 'billing.vat.included' },
        termsVersion: '2026-09-18',
        withdrawal: { available: true, windowDays: 14, windowClosesAt: null },
    };
}

// The same step with both boxes checked.
export function storyAddonStepReady(overrides: Partial<InvitationAddonCheckout> = {}): InvitationAddonCheckout {
    return storyAddonStepCheckout({ consent: storyFeatureAddonsReady().consent, canSubmit: true, ...overrides });
}
