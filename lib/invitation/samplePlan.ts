import type { PlanTierResponseDto } from '@/lib/api/types';

// A wedding plan that includes the online invitation, sold for 3 or 12 months. For stories and tests.
export function sampleInvitationPlan(overrides: Partial<PlanTierResponseDto> = {}): PlanTierResponseDto {
    return {
        id: 'plan-premium',
        code: 'PREMIUM',
        scope: 'EVENT',
        name: 'Premium',
        description: null,
        sortOrder: 1,
        isDefault: false,
        isAssignable: true,
        isPublic: true,
        isGiftable: false,
        storageBytes: 50 * 1024 ** 3,
        maxMembers: 300,
        priceAmountMinor: null,
        priceCurrency: 'EUR',
        billingPeriod: null,
        discountPercent: null,
        discountLabel: null,
        discountStartsAt: null,
        discountEndsAt: null,
        moduleKeys: ['posts', 'gallery', 'rsvp', 'save_my_date'],
        paidModules: [],
        moduleConfigs: {},
        eventTypeKey: 'WEDDING',
        sharedGroupKey: null,
        initialOptions: [
            { id: 'opt-3m', kind: 'INITIAL', months: 3, priceAmountMinor: 4900, promoPriceAmountMinor: null, sortOrder: 0, active: true },
            { id: 'opt-12m', kind: 'INITIAL', months: 12, priceAmountMinor: 9900, promoPriceAmountMinor: null, sortOrder: 1, active: true },
        ],
        extensionOptions: [],
        ...overrides,
    };
}
