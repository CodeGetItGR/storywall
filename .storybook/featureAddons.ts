import type { FeatureAddons } from '@/hooks/useFeatureAddons';
import type { PaidServiceResponseDto } from '@/lib/api/types';

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
    const state: Omit<FeatureAddons, 'handleToggleChange' | 'handleDraftAddonClick' | 'handlePayClick'> = {
        mode: 'checkout',
        offers: [storySaveMyDateAddon, storyRsvpAddon, storyGalleryAddon].map((service) => ({ service, added: false })),
        isLoading: false,
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
