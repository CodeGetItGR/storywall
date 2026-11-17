import { describe, expect, it } from 'vitest';

import type { CoverageOptionResponseDto, OrderSummaryDto, PlanTierResponseDto } from '@/lib/api/types';

import {
    activePromoPriceMinor,
    canExtendCoverage,
    discountedAmountMinor,
    formatMoney,
    isCampaignDiscountLive,
    isOrderPaidByAnother,
    lastWithdrawalMoment,
    nextCampaignBoundary,
    paidBillingTotal,
    partnerBrandingCheckoutFields,
    promotedAmount,
    promotedOption,
    promotedOptionAmountMinor,
    readPendingCheckout,
    rememberPendingCheckout,
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

    const campaign = {
        campaignDiscountPercent: 20,
        campaignDiscountLabel: 'Black Friday',
        campaignDiscountStartsAt: '2026-10-07T09:00:00Z',
        campaignDiscountEndsAt: '2026-10-07T11:00:00Z',
    };

    it('reads a campaign as live only inside its dates', () => {
        expect(isCampaignDiscountLive(plan(campaign), now)).toBe(true);
        expect(isCampaignDiscountLive(plan(campaign), new Date('2026-10-07T08:59:00Z'))).toBe(false);
        expect(isCampaignDiscountLive(plan(campaign), new Date('2026-10-07T11:00:00Z'))).toBe(false);
        expect(isCampaignDiscountLive(plan(), now)).toBe(false);
    });

    it('takes the campaign when it is cheaper, under its own label', () => {
        expect(promotedAmount(10_000, plan({ ...campaign, discountPercent: 10, discountLabel: 'Sale' }), now)).toEqual({
            amountMinor: 8_000,
            discountActive: true,
            discountLabel: 'Black Friday',
        });
    });

    it("keeps the plan's own percent when it is cheaper or the same", () => {
        expect(promotedAmount(10_000, plan({ ...campaign, discountPercent: 30, discountLabel: 'Sale' }), now)).toEqual({
            amountMinor: 7_000,
            discountActive: true,
            discountLabel: 'Sale',
        });
        expect(promotedAmount(10_000, plan({ ...campaign, discountPercent: 20, discountLabel: 'Sale' }), now).discountLabel).toBe('Sale');
    });

    it('compares a promo price with the campaign price', () => {
        const below = option({ priceAmountMinor: 10_000, promoPriceAmountMinor: 7_000 });
        const above = option({ priceAmountMinor: 10_000, promoPriceAmountMinor: 9_000 });

        expect(promotedOption(below, plan({ ...campaign, discountLabel: 'Sale' }), now).amountMinor).toBe(7_000);
        expect(promotedOption(above, plan({ ...campaign, discountLabel: 'Sale' }), now)).toEqual({
            amountMinor: 8_000,
            discountActive: true,
            discountLabel: 'Black Friday',
        });
        expect(promotedOptionAmountMinor(above, plan(campaign), now)).toBe(8_000);
    });

    it('truncates the discount, not the price', () => {
        expect(promotedAmount(999, plan({ ...campaign, campaignDiscountPercent: 12.5 }), now).amountMinor).toBe(875);
    });

    it('finds the next campaign start or end across the plans', () => {
        const sooner = { ...campaign, campaignDiscountStartsAt: '2026-10-07T12:00:00Z', campaignDiscountEndsAt: '2026-10-07T13:00:00Z' };

        expect(nextCampaignBoundary([plan(campaign), plan(sooner)], now)).toBe(Date.parse('2026-10-07T11:00:00Z'));
        expect(nextCampaignBoundary([plan(sooner)], now)).toBe(Date.parse('2026-10-07T12:00:00Z'));
        expect(nextCampaignBoundary([plan(campaign)], new Date('2026-10-07T11:00:00Z'))).toBeNull();
        expect(nextCampaignBoundary([plan(), plan({ ...campaign, campaignDiscountPercent: null })], now)).toBeNull();
        expect(nextCampaignBoundary([], now)).toBeNull();
    });

    it('drops back to the normal price at the second a campaign ends', () => {
        const atEnd = new Date('2026-10-07T11:00:00Z');

        expect(discountedAmountMinor(10_000, plan(campaign), atEnd)).toBe(10_000);
    });
});

describe('pending checkout', () => {
    it('keeps where to go once paid, only when it is a path in the app', () => {
        rememberPendingCheckout('evt-1', 'ord-1', 'PREMIUM', '/save-my-date/editor/draft-1?publish=1');
        expect(readPendingCheckout('evt-1')).toEqual({
            orderId: 'ord-1',
            planTierCode: 'PREMIUM',
            returnTo: '/save-my-date/editor/draft-1?publish=1',
        });
        rememberPendingCheckout('evt-2', 'ord-2', null, 'https://example.com/');
        expect(readPendingCheckout('evt-2')).toEqual({ orderId: 'ord-2' });
        window.sessionStorage.clear();
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

describe('partnerBrandingCheckoutFields', () => {
    const notice = { displayName: 'Barn Venue', noticeVersion: '2026-10-08' };

    it('leaves the fields out when the code carries no partner notice', () => {
        expect(partnerBrandingCheckoutFields(null, true)).toEqual({});
    });

    it('sends the acceptance with the version of the notice that was shown', () => {
        expect(partnerBrandingCheckoutFields(notice, true)).toEqual({ acceptsPartnerBranding: true, partnerBrandingNoticeVersion: '2026-10-08' });
    });

    it('sends a refusal as false rather than leaving it out', () => {
        expect(partnerBrandingCheckoutFields(notice, false)).toEqual({ acceptsPartnerBranding: false, partnerBrandingNoticeVersion: '2026-10-08' });
    });
});
