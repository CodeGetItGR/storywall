import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';

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
        buyerType: 'CONSUMER',
        breakdown: null,
        paidByCaller: true,
        firstPurchase: null,
        ...overrides,
    };
}

function noop() {}

function renderPanel(
    orders: OrderSummaryDto[],
    withdraw?: { ids: Set<string>; onWithdraw: (order: OrderSummaryDto) => void },
    paidTotalMinor: number | null = 1500,
) {
    const data = { orders } as BillingData;
    const derived = { visibleOrders: orders, hiddenOrderCount: 0, canManageAddons: false } as BillingDerived;
    const insights = { paidTotalMinor, orderCurrency: 'EUR' } as BillingInsights;
    return render(
        <NextIntlClientProvider locale="en" messages={messages} timeZone="UTC">
            <BillingOrdersPanel
                data={data}
                derived={derived}
                insights={insights}
                onShowAllOrders={noop}
                withdrawableOrderIds={withdraw?.ids}
                onWithdrawAction={withdraw?.onWithdraw}
            />
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

        expect(screen.getByText('Coverage extension')).toBeInTheDocument();
        expect(screen.getByText('Sep 20, 2027 to Dec 20, 2027')).toBeInTheDocument();
    });

    it('shows no span for an unpaid extension', () => {
        renderPanel([order({ id: 'ext-2', kind: 'EXTENSION', status: 'PENDING', paidAt: null })]);

        expect(screen.getByText('Coverage extension')).toBeInTheDocument();
        expect(screen.queryByText(/ to /)).not.toBeInTheDocument();
    });

    it('keeps the existing kinds unchanged', () => {
        renderPanel([order({ id: 'up-1', kind: 'UPGRADE' }), order({ id: 'pack-1', kind: 'STORAGE_PACK' })]);

        expect(screen.getByText('Upgrade')).toBeInTheDocument();
        expect(screen.getByText('Plan upgrade. Coverage unchanged.')).toBeInTheDocument();
        expect(screen.getByText('Storage pack')).toBeInTheDocument();
        expect(screen.getByText('Permanent storage increase.')).toBeInTheDocument();
    });

    it('offers the withdrawal function only on the orders that can still be withdrawn', () => {
        const onWithdraw = vi.fn();
        const upgrade = order({ id: 'up-1', kind: 'UPGRADE' });
        renderPanel([upgrade, order({ id: 'pack-1', kind: 'STORAGE_PACK' })], { ids: new Set(['up-1']), onWithdraw });

        const buttons = screen.getAllByRole('button', { name: 'Withdraw from contract here' });
        expect(buttons).toHaveLength(1);
        fireEvent.click(buttons[0]);
        expect(onWithdraw).toHaveBeenCalledWith(upgrade);
    });

    it('shows a gift instead of an amount and no total', () => {
        renderPanel([order({ id: 'gift-1', paidByCaller: false, amountMinor: null })], undefined, null);

        expect(screen.getByText('Gift')).toBeInTheDocument();
        expect(screen.queryByText(/€0/)).not.toBeInTheDocument();
        expect(screen.queryByText(messages.EventPlanSettingsPage.facts.totalPaid)).not.toBeInTheDocument();
    });

    it('shows each order once, as a row with its status, date and amount, then the total paid', () => {
        renderPanel([order({ id: 'act-1' })]);

        expect(screen.queryByRole('table')).not.toBeInTheDocument();
        const row = screen.getByRole('listitem');
        expect(row).toHaveTextContent('Activation');
        expect(row).toHaveTextContent(messages.EventPlanSettingsPage.orderStatus.PAID);
        expect(row).toHaveTextContent('Sep 24, 2026');
        expect(row).toHaveTextContent('€15.00');
        expect(screen.getByText(messages.EventPlanSettingsPage.facts.totalPaid)).toBeInTheDocument();
    });

    it('says so when there are no orders yet', () => {
        renderPanel([]);

        expect(screen.getByText(messages.EventPlanSettingsPage.orders.empty)).toBeInTheDocument();
    });
});
