import { cleanup, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it } from 'vitest';

import { BillingOrdersPanel } from '@/components/manage/billing/BillingOrdersPanel';
import type { BillingData, BillingDerived, BillingInsights } from '@/hooks/useEventBillingPanel';
import type { OrderSummaryDto } from '@/lib/api/types';
import messages from '@/messages/en.json';

function order(overrides: Partial<OrderSummaryDto>): OrderSummaryDto {
    return {
        id: 'order-1',
        kind: 'ACTIVATION',
        status: 'PAID',
        amountMinor: 1500,
        addonAmountMinor: null,
        currency: 'EUR',
        paidAt: '2026-09-24T10:00:00Z',
        createdAt: '2026-09-24T10:00:00Z',
        setupAmountMinor: null,
        eventDayAmountMinor: null,
        hostingAmountMinor: null,
        coverageMonths: null,
        coverageMonthsAdded: null,
        coverageStartsAt: null,
        coverageEndsAt: null,
        ...overrides,
    };
}

function noop() {}

function renderPanel(orders: OrderSummaryDto[]) {
    const data = { orders } as BillingData;
    const derived = { visibleOrders: orders, hiddenOrderCount: 0, canManageAddons: false } as BillingDerived;
    const insights = { paidTotalMinor: 1500, orderCurrency: 'EUR' } as BillingInsights;
    return render(
        <NextIntlClientProvider locale="en" messages={messages} timeZone="UTC">
            <BillingOrdersPanel data={data} derived={derived} insights={insights} onShowAllOrders={noop} />
        </NextIntlClientProvider>,
    );
}

afterEach(cleanup);

describe('BillingOrdersPanel', () => {
    it('labels an extension and shows the span it covers', () => {
        renderPanel([
            order({
                id: 'ext-1',
                kind: 'EXTENSION',
                coverageMonths: 3,
                coverageStartsAt: '2027-09-20T12:00:00Z',
                coverageEndsAt: '2027-12-20T12:00:00Z',
            }),
        ]);

        // Once for small screens, once for the desktop table.
        expect(screen.getAllByText('Coverage extension')).toHaveLength(2);
        expect(screen.getAllByText('Sep 20, 2027 to Dec 20, 2027')).toHaveLength(2);
    });

    it('shows no span for an unpaid extension', () => {
        renderPanel([order({ id: 'ext-2', kind: 'EXTENSION', status: 'PENDING', paidAt: null })]);

        expect(screen.getAllByText('Coverage extension')).toHaveLength(2);
        expect(screen.queryByText(/ to /)).not.toBeInTheDocument();
    });

    it('keeps the existing kinds unchanged', () => {
        renderPanel([order({ id: 'up-1', kind: 'UPGRADE' }), order({ id: 'pack-1', kind: 'STORAGE_PACK' })]);

        expect(screen.getAllByText('Upgrade')).toHaveLength(2);
        expect(screen.getAllByText('Plan upgrade. Coverage unchanged.')).toHaveLength(2);
        expect(screen.getAllByText('Storage pack')).toHaveLength(2);
        expect(screen.getAllByText('Permanent storage increase.')).toHaveLength(2);
    });
});
