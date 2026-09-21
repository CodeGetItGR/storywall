import { describe, expect, it } from 'vitest';

import type { PlanTierResponseDto } from '@/lib/api/types';
import { findNextPlan } from '@/lib/planTiers';

function makePlan(overrides: Partial<PlanTierResponseDto> = {}): PlanTierResponseDto {
    return {
        id: 'wedding-start',
        code: 'WEDDING_START',
        scope: 'EVENT',
        name: 'START',
        description: null,
        sortOrder: 0,
        isDefault: true,
        isAssignable: true,
        isPublic: true,
        storageBytes: 1_000,
        maxMembers: 100,
        autoDeleteMonths: 3,
        priceAmountMinor: 5_000,
        priceCurrency: 'EUR',
        billingPeriod: 'ONE_TIME',
        discountPercent: null,
        discountLabel: null,
        discountStartsAt: null,
        discountEndsAt: null,
        moduleKeys: [],
        paidModules: [],
        eventTypeKey: 'WEDDING',
        sharedGroupKey: null,
        ...overrides,
    };
}

describe('findNextPlan', () => {
    it('does not cross event types when catalog rows share a display name', () => {
        const plans = [
            makePlan({ id: 'wedding-signature', code: 'WEDDING_SIGNATURE', name: 'SIGNATURE', sortOrder: 1, priceAmountMinor: 10_000 }),
            makePlan({
                id: 'social-signature',
                code: 'SOCIAL_SIGNATURE',
                name: 'SIGNATURE',
                eventTypeKey: 'SOCIAL_EVENT',
                sortOrder: 2,
                priceAmountMinor: 15_000,
            }),
            makePlan({ id: 'wedding-premium', code: 'WEDDING_PREMIUM', name: 'PREMIUM', sortOrder: 3, priceAmountMinor: 20_000 }),
        ];

        expect(findNextPlan(plans, 'EVENT', 'WEDDING_SIGNATURE')?.code).toBe('WEDDING_PREMIUM');
    });

    it('skips plans that the backend would reject as an upgrade', () => {
        const plans = [
            makePlan(),
            makePlan({ id: 'same-price', code: 'SAME_PRICE', sortOrder: 1 }),
            makePlan({ id: 'wrong-currency', code: 'WRONG_CURRENCY', sortOrder: 2, priceAmountMinor: 10_000, priceCurrency: 'USD' }),
            makePlan({ id: 'upgrade', code: 'UPGRADE', sortOrder: 3, priceAmountMinor: 10_000 }),
        ];

        expect(findNextPlan(plans, 'EVENT', 'WEDDING_START')?.code).toBe('UPGRADE');
    });

    it('returns no fallback when the current catalog row is missing', () => {
        expect(findNextPlan([makePlan()], 'EVENT', 'STALE_PLAN')).toBeUndefined();
    });
});
