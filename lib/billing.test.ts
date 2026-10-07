import { describe, expect, it } from 'vitest';

import type { CoverageOptionResponseDto, OrderSummaryDto, PlanTierResponseDto } from '@/lib/api/types';

import {
    activePromoPriceMinor,
    canExtendCoverage,
    discountedAmountMinor,
    formatMoney,
    isOrderPaidByAnother,
    lastWithdrawalMoment,
    paidBillingTotal,
    promotedOptionAmountMinor,
} from './billing';

describe('plan promotions', () => {
    const now = new Date('2026-10-07T10:00:00Z');
    const plan = (overrides: Partial<PlanTierResponseDto> = {}) =>
        ({ discountPercent: null, discountStartsAt: null, discountEndsAt: null, ...overrides }) as PlanTierResponseDto;
    const option = (overrides: Partial<CoverageOptionResponseDto> = {}): CoverageOptionResponseDto => ({
        id: 'o1',
        kind: 'INITIAL',
        months: 6,
        priceAmountMinor: 12_900,
        promoPriceAmountMinor: null,
        sortOrder: 0,
        active: true,
        ...overrides,
    });

    it('truncates the discount, never the price, as the server does', () => {
        expect(discountedAmountMinor(999, plan({ discountPercent: 12.5 }), now)).toBe(875);
        expect(discountedAmountMinor(10_000, plan({ discountPercent: 20 }), now)).toBe(8_000);
    });

    it("charges a duration's promo price in place of the plan's percent", () => {
        const promoted = option({ promoPriceAmountMinor: 9_900 });

        expect(promotedOptionAmountMinor(promoted, plan({ discountPercent: 50 }), now)).toBe(9_900);
        expect(promotedOptionAmountMinor(option(), plan({ discountPercent: 50 }), now)).toBe(6_450);
    });

    it('honours a promo price only inside the promotion window', () => {
        const promoted = option({ promoPriceAmountMinor: 9_900 });

        expect(activePromoPriceMinor(promoted, plan({ discountStartsAt: '2026-10-08T00:00:00Z' }), now)).toBeNull();
        expect(activePromoPriceMinor(promoted, plan({ discountEndsAt: '2026-10-07T10:00:00Z' }), now)).toBeNull();
        expect(promotedOptionAmountMinor(promoted, plan({ discountEndsAt: '2026-10-07T09:00:00Z' }), now)).toBe(12_900);
        expect(activePromoPriceMinor(promoted, plan({ discountEndsAt: '2026-10-08T00:00:00Z' }), now)).toBe(9_900);
    });

    it('never applies a promo price to an extension', () => {
        expect(activePromoPriceMinor(option({ kind: 'EXTENSION', promoPriceAmountMinor: 9_900 }), plan(), now)).toBeNull();
    });
});

describe('lastWithdrawalMoment', () => {
    it('is one second before the window closes', () => {
        expect(lastWithdrawalMoment('2026-10-06T21:00:00Z').toISOString()).toBe('2026-10-06T20:59:59.000Z');
    });
});

describe('formatMoney', () => {
    it('shows a bare amount when there is no currency', () => {
        expect(formatMoney('en', 3965, null)).toBe('39.65');
    });
});

describe('canExtendCoverage', () => {
    const now = new Date('2026-09-24T12:00:00Z');
    const eligible = { isPrimaryHost: true, eventStatus: 'ACTIVE' as const, coverageEndsAt: '2027-09-24T12:00:00Z', now };

    it('allows the main host of a live event whose coverage has not ended', () => {
        expect(canExtendCoverage(eligible)).toBe(true);
    });

    it('refuses a co-host, a draft, ended coverage and a missing end', () => {
        expect(canExtendCoverage({ ...eligible, isPrimaryHost: false })).toBe(false);
        expect(canExtendCoverage({ ...eligible, eventStatus: 'DRAFT' })).toBe(false);
        expect(canExtendCoverage({ ...eligible, coverageEndsAt: '2026-09-24T12:00:00Z' })).toBe(false);
        expect(canExtendCoverage({ ...eligible, coverageEndsAt: null })).toBe(false);
    });
});

describe('gift orders', () => {
    const order = (overrides: Partial<OrderSummaryDto>) =>
        ({ status: 'PAID', amountMinor: 1000, paidByCaller: true, ...overrides }) as OrderSummaryDto;

    it('spots an order someone else paid for', () => {
        expect(isOrderPaidByAnother({ paidByCaller: false, amountMinor: null })).toBe(true);
        expect(isOrderPaidByAnother({ paidByCaller: true, amountMinor: 1000 })).toBe(false);
        expect(isOrderPaidByAnother({ paidByCaller: null, amountMinor: 1000 })).toBe(false);
    });

    it('sums paid orders', () => {
        expect(paidBillingTotal([order({}), order({ amountMinor: 500 }), order({ status: 'PENDING' })])).toBe(1500);
    });

    it('has no total when a paid order was a gift', () => {
        expect(paidBillingTotal([order({}), order({ paidByCaller: false, amountMinor: null })])).toBeNull();
    });
});
