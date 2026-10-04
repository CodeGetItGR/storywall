import { describe, expect, it } from 'vitest';

import {
    accountingExportRangeError,
    adminOrdersPath,
    attachmentFilename,
    businessSnapshotEntries,
    countMoreFilters,
    EMPTY_ORDER_FILTERS,
    filterValueFromInput,
    formatOrdersHash,
    hasOrderFilters,
    isOrderRangeInvalid,
    lastMonthRange,
    orderActivity,
    parseOrdersHash,
} from '@/lib/adminOrders';
import type { AdminOrderDetailDto } from '@/lib/api/types';

describe('adminOrdersPath', () => {
    it('sends only page and size when nothing is filtered', () => {
        expect(adminOrdersPath(EMPTY_ORDER_FILTERS, 0, 50)).toBe('/api/admin/orders?page=0&size=50');
    });

    it('sends every filter that is set, booleans included when false', () => {
        const path = adminOrdersPath(
            {
                status: 'PAID',
                kind: 'UPGRADE',
                buyerType: 'BUSINESS',
                provider: 'STRIPE',
                from: '2026-09-01',
                to: '2026-09-30',
                disputeOpen: false,
                comp: true,
                buyerId: 'u-1',
                q: '  maria@example.com ',
            },
            2,
            50,
        );
        const params = new URL(path, 'http://x').searchParams;

        expect(Object.fromEntries(params)).toEqual({
            page: '2',
            size: '50',
            status: 'PAID',
            kind: 'UPGRADE',
            buyerType: 'BUSINESS',
            provider: 'STRIPE',
            from: '2026-09-01',
            to: '2026-09-30',
            disputeOpen: 'false',
            comp: 'true',
            buyerId: 'u-1',
            q: 'maria@example.com',
        });
    });
});

describe('orders hash', () => {
    it('round-trips an order id and treats the bare root as the list', () => {
        expect(parseOrdersHash(formatOrdersHash('a-1'))).toBe('a-1');
        expect(parseOrdersHash('#orders')).toBeNull();
        expect(parseOrdersHash('#withdrawals/a-1')).toBeNull();
        expect(formatOrdersHash(null)).toBe('#orders');
    });
});

describe('filters', () => {
    it('reads select and date inputs as the filter holds them', () => {
        expect(filterValueFromInput('status', '')).toBeNull();
        expect(filterValueFromInput('status', 'PAID')).toBe('PAID');
        expect(filterValueFromInput('disputeOpen', 'false')).toBe(false);
        expect(filterValueFromInput('comp', 'true')).toBe(true);
        expect(filterValueFromInput('from', '')).toBe('');
    });

    it('knows when anything is filtered and counts the extra filters', () => {
        expect(hasOrderFilters(EMPTY_ORDER_FILTERS)).toBe(false);
        expect(hasOrderFilters({ ...EMPTY_ORDER_FILTERS, q: 'x' })).toBe(true);
        expect(countMoreFilters({ ...EMPTY_ORDER_FILTERS, comp: false, provider: 'MANUAL', status: 'PAID' })).toBe(2);
    });

    it('holds the list back while the range ends before it starts', () => {
        expect(isOrderRangeInvalid({ from: '2026-09-02', to: '2026-09-01' })).toBe(true);
        expect(isOrderRangeInvalid({ from: '2026-09-01', to: '2026-09-01' })).toBe(false);
        expect(isOrderRangeInvalid({ from: '', to: '2026-09-01' })).toBe(false);
    });
});

describe('accounting export', () => {
    it('defaults to the last full month, across a year boundary too', () => {
        expect(lastMonthRange(new Date(2026, 9, 2))).toEqual({ from: '2026-09-01', to: '2026-09-30' });
        expect(lastMonthRange(new Date(2027, 0, 15))).toEqual({ from: '2026-12-01', to: '2026-12-31' });
    });

    it('refuses what the server would refuse', () => {
        expect(accountingExportRangeError({ from: '', to: '2026-09-30' })).toBe('missing');
        expect(accountingExportRangeError({ from: '2026-09-30', to: '2026-09-01' })).toBe('order');
        expect(accountingExportRangeError({ from: '2025-09-30', to: '2026-09-30' })).toBe(null);
        expect(accountingExportRangeError({ from: '2025-09-29', to: '2026-09-30' })).toBe('tooLong');
    });

    it('saves under the server filename, or a fallback when the header is not readable', () => {
        expect(attachmentFilename('attachment; filename="payments-2026-09-01-to-2026-09-30.csv"', 'x.csv')).toBe(
            'payments-2026-09-01-to-2026-09-30.csv',
        );
        expect(attachmentFilename(null, 'x.csv')).toBe('x.csv');
    });
});

describe('businessSnapshotEntries', () => {
    it('keeps the known fields in order and drops the empty ones', () => {
        expect(businessSnapshotEntries({ city: 'Athens', legalName: 'Acme', vatNumber: '', viesRequestIdentifier: 'r' })).toEqual([
            { key: 'legalName', value: 'Acme' },
            { key: 'city', value: 'Athens' },
        ]);
    });
});

describe('orderActivity', () => {
    const base = {
        summary: { createdAt: '2026-09-01T10:00:00Z', paidAt: '2026-09-01T10:00:00Z' },
        payment: { disputedAt: null, disputeClosedAt: null },
        refund: null,
        settledBy: null,
        withdrawals: [],
        commissions: [],
    };

    it('starts with placed then paid, even at the same instant', () => {
        const items = orderActivity(base as unknown as AdminOrderDetailDto);
        expect(items.map((item) => item.kind)).toEqual(['placed', 'paid']);
    });

    it('merges disputes, refunds, withdrawals and commission oldest first, and names an admin who settled it', () => {
        const items = orderActivity({
            ...base,
            settledBy: { userId: 'a-1', name: null, email: 'ops@example.com' },
            payment: { disputedAt: '2026-09-05T00:00:00Z', disputeClosedAt: '2026-09-09T00:00:00Z' },
            refund: { refundedAt: '2026-09-07T00:00:00Z', amountMinor: 100, source: 'WITHDRAWAL', providerRefundId: null },
            withdrawals: [{ id: 'w-1', createdAt: '2026-09-03T00:00:00Z' }],
            commissions: [{ id: 'c-1', createdAt: '2026-09-01T10:01:00Z' }],
        } as unknown as AdminOrderDetailDto);

        expect(items.map((item) => item.kind)).toEqual(['placed', 'paid', 'commission', 'withdrawal', 'disputeOpened', 'refunded', 'disputeClosed']);
        expect(items[1]).toMatchObject({ kind: 'paid', settledBy: 'ops@example.com' });
    });

    it('leaves out payment for an order never paid', () => {
        const items = orderActivity({ ...base, summary: { ...base.summary, paidAt: null } } as unknown as AdminOrderDetailDto);
        expect(items.map((item) => item.kind)).toEqual(['placed']);
    });
});
