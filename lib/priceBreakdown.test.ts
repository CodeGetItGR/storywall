import { describe, expect, it } from 'vitest';

import type { OrderSummaryDto, PriceBreakdown, PriceBreakdownItem, WithdrawalResponseDto } from '@/lib/api/types';

import {
    breakdownAddedSuffix,
    breakdownDiscountMessageKey,
    breakdownItemLabelValues,
    breakdownItemMessageKey,
    isAlreadyRefundedLine,
    orderWithdrawalWindowOpen,
    withdrawableOrderIds,
    withdrawalPurchaseBlocks,
} from './priceBreakdown';

function item(overrides: Partial<PriceBreakdownItem> = {}): PriceBreakdownItem {
    return {
        code: 'COVERAGE',
        labelKey: 'billing.item.upgrade.coverage',
        name: 'Premium',
        listMinor: 3500,
        discountMinor: 0,
        priceMinor: 3500,
        withdrawal: 'PRO_RATA_BY_TIME',
        performedAt: null,
        months: 18,
        monthsAdded: 6,
        paidServiceCode: null,
        planTierCode: 'PREMIUM',
        storageBytes: null,
        ...overrides,
    };
}

function breakdown(withdrawal: PriceBreakdown['withdrawal']): PriceBreakdown {
    return {
        kind: 'UPGRADE',
        currency: 'EUR',
        buyerType: 'CONSUMER',
        coverage: { optionId: 'o', months: 18, monthsAdded: 6, endsAt: null, endsAtProjected: false },
        items: [item()],
        discounts: [],
        combinedDiscountPercent: 0,
        discountCapPercent: 30,
        capApplied: false,
        listTotalMinor: 3500,
        discountTotalMinor: 0,
        totalMinor: 3500,
        vat: { included: true, note: 'billing.vat.included' },
        termsVersion: '2026-09-24',
        withdrawal,
    };
}

function order(overrides: Partial<OrderSummaryDto> = {}): OrderSummaryDto {
    return {
        id: 'order-1',
        kind: 'UPGRADE',
        status: 'PAID',
        amountMinor: 3500,
        addonAmountMinor: null,
        currency: 'EUR',
        paidAt: '2026-09-20T10:00:00Z',
        createdAt: '2026-09-20T10:00:00Z',
        setupAmountMinor: null,
        eventDayAmountMinor: null,
        hostingAmountMinor: null,
        coverageMonths: 18,
        coverageMonthsAdded: 6,
        coverageStartsAt: null,
        coverageEndsAt: null,
        buyerType: 'CONSUMER',
        breakdown: breakdown({ available: true, windowDays: 14, windowClosesAt: '2026-10-05T21:00:00Z' }),
        ...overrides,
    };
}

function withdrawal(overrides: Partial<WithdrawalResponseDto>): WithdrawalResponseDto {
    return {
        id: 'w-1',
        eventId: 'event-1',
        scope: 'EVENT',
        orderId: null,
        status: 'HELD',
        reason: null,
        createdAt: '2026-09-21T10:00:00Z',
        decidedAt: null,
        decisionNote: null,
        holdUntil: null,
        totalRefundMinor: null,
        currency: null,
        refusals: [],
        lines: [],
        excludedOrders: [],
        ...overrides,
    };
}

describe('breakdown labels', () => {
    it('maps the backend label keys and leaves unknown ones to the item name', () => {
        expect(breakdownItemMessageKey('billing.item.upgrade.coverage')).toBe('upgradeCoverage');
        expect(breakdownItemMessageKey('billing.item.something')).toBeNull();
    });

    it('adds "(+N)" only when an upgrade adds months', () => {
        expect(breakdownAddedSuffix(6)).toBe(' (+6)');
        expect(breakdownAddedSuffix(0)).toBe('');
        expect(breakdownAddedSuffix(null)).toBe('');
        expect(breakdownItemLabelValues(item(), '18 months')).toEqual({ plan: 'Premium', name: 'Premium', monthsText: '18 months', added: ' (+6)' });
    });

    it('uses the unnamed wording for a discount without a label', () => {
        expect(breakdownDiscountMessageKey({ source: 'CODE', label: 'SUMMER', percent: 10 })).toBe('CODE');
        expect(breakdownDiscountMessageKey({ source: 'CODE', label: null, percent: 10 })).toBe('CODE_unnamed');
        expect(breakdownDiscountMessageKey({ source: 'PLAN_PROMOTION', label: ' ', percent: 10 })).toBe('PLAN_PROMOTION_unnamed');
    });
});

describe('orderWithdrawalWindowOpen', () => {
    const now = new Date('2026-09-25T10:00:00Z');

    it('is open for a paid consumer order before its window closes', () => {
        expect(orderWithdrawalWindowOpen(order(), now)).toBe(true);
    });

    it('is closed once the window has passed, the order is not paid, or it was a business purchase', () => {
        expect(orderWithdrawalWindowOpen(order(), new Date('2026-10-05T21:00:00Z'))).toBe(false);
        expect(orderWithdrawalWindowOpen(order({ status: 'REFUNDED' }), now)).toBe(false);
        expect(orderWithdrawalWindowOpen(order({ buyerType: 'BUSINESS' }), now)).toBe(false);
        expect(orderWithdrawalWindowOpen(order({ breakdown: breakdown({ available: false, windowDays: 14, windowClosesAt: null }) }), now)).toBe(
            false,
        );
    });

    it('defers to the preview for an order with no breakdown', () => {
        expect(orderWithdrawalWindowOpen(order({ breakdown: null }), now)).toBeNull();
    });
});

describe('withdrawableOrderIds', () => {
    const now = new Date('2026-09-25T10:00:00Z');

    it('takes breakdown orders as they are and legacy orders from their preview', () => {
        const orders = [
            order({ id: 'new' }),
            order({ id: 'legacy-open', breakdown: null }),
            order({ id: 'legacy-refused', breakdown: null }),
            order({ id: 'legacy-loading', breakdown: null }),
        ];
        const previews = new Map([
            ['legacy-open', { eligible: true, windowClosesAt: '2026-09-30T21:00:00Z' }],
            ['legacy-refused', { eligible: false, windowClosesAt: '2026-09-30T21:00:00Z' }],
        ]);
        expect([...withdrawableOrderIds(orders, previews, now)]).toEqual(['new', 'legacy-open']);
    });
});

describe('withdrawalPurchaseBlocks', () => {
    const orders = [order({ id: 'upgrade-1', kind: 'UPGRADE' }), order({ id: 'pack-1', kind: 'STORAGE_PACK' })];

    it('blocks upgrades and packs while the whole event is under review', () => {
        expect(withdrawalPurchaseBlocks([withdrawal({ scope: 'EVENT' })], orders)).toEqual({ upgradeBlocked: true, storageBlocked: true });
    });

    it('blocks only upgrades while an upgrade is under review', () => {
        expect(withdrawalPurchaseBlocks([withdrawal({ scope: 'ORDER', orderId: 'upgrade-1' })], orders)).toEqual({
            upgradeBlocked: true,
            storageBlocked: false,
        });
    });

    it('blocks nothing for a held pack or a decided request', () => {
        expect(withdrawalPurchaseBlocks([withdrawal({ scope: 'ORDER', orderId: 'pack-1' })], orders)).toEqual({
            upgradeBlocked: false,
            storageBlocked: false,
        });
        expect(withdrawalPurchaseBlocks([withdrawal({ scope: 'EVENT', status: 'REFUNDED' })], orders)).toEqual({
            upgradeBlocked: false,
            storageBlocked: false,
        });
    });
});

describe('isAlreadyRefundedLine', () => {
    it('flags a released line that paid nothing back', () => {
        expect(isAlreadyRefundedLine({ refundMinor: 0, providerRefunded: false }, 'REFUNDED')).toBe(true);
        expect(isAlreadyRefundedLine({ refundMinor: 500, providerRefunded: true }, 'REFUNDED')).toBe(false);
        expect(isAlreadyRefundedLine({ refundMinor: 0, providerRefunded: false }, 'HELD')).toBe(false);
    });
});
