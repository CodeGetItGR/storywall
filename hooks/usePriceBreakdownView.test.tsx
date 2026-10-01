import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { usePriceBreakdownView } from '@/hooks/usePriceBreakdownView';
import type { PriceBreakdown, PriceBreakdownItem } from '@/lib/api/types';

vi.mock('next-intl', () => ({
    useLocale: () => 'en',
    useTranslations: () => (key: string) => key,
}));

function item(overrides: Partial<PriceBreakdownItem>): PriceBreakdownItem {
    return {
        code: 'ACTIVATION',
        labelKey: 'billing.item.upgrade.setup',
        name: 'Premium',
        listMinor: 1000,
        discountMinor: 0,
        priceMinor: 1000,
        withdrawal: 'RETAINED_ONCE_STARTED',
        performedAt: null,
        months: null,
        monthsAdded: null,
        paidServiceCode: null,
        planTierCode: 'PREMIUM',
        storageBytes: null,
        ...overrides,
    };
}

// An upgrade bought after the event day has no EVENT_DAY item: only setup and coverage.
const upgradeAfterEvent: PriceBreakdown = {
    kind: 'UPGRADE',
    currency: 'EUR',
    buyerType: 'CONSUMER',
    coverage: { optionId: 'cov-12', months: 12, monthsAdded: 0, endsAt: null, endsAtProjected: false },
    items: [
        item({}),
        item({
            code: 'COVERAGE',
            labelKey: 'billing.item.upgrade.coverage',
            priceMinor: 500,
            listMinor: 500,
            withdrawal: 'PRO_RATA_BY_TIME',
            months: 12,
            monthsAdded: 0,
        }),
    ],
    discounts: [],
    combinedDiscountPercent: 0,
    discountCapPercent: 50,
    capApplied: false,
    listTotalMinor: 1500,
    discountTotalMinor: 0,
    totalMinor: 1500,
    vat: { included: true, note: 'billing.vat.included' },
    termsVersion: 'v1',
    withdrawal: { available: true, windowDays: 14, windowClosesAt: null },
};

describe('usePriceBreakdownView', () => {
    it('renders an upgrade without an event-day item', () => {
        const { result } = renderHook(() => usePriceBreakdownView(upgradeAfterEvent));

        expect(result.current?.items.map((row) => row.label)).toEqual(['items.upgradeSetup', 'items.upgradeCoverage']);
        expect(result.current?.items.map((row) => row.rule)).toEqual(['rules.RETAINED_ONCE_STARTED', 'rules.PRO_RATA_BY_TIME']);
        expect(result.current?.total).toContain('15');
    });
});
