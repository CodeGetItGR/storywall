import { cleanup, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it } from 'vitest';

import { OrdersTable } from '@/components/admin/orders/OrdersTable';
import type { AdminOrderSummaryDto } from '@/lib/api/types';
import messages from '@/messages/en.json';

const paid: AdminOrderSummaryDto = {
    id: 'o-1',
    createdAt: '2026-09-28T10:00:00Z',
    paidAt: '2026-09-28T10:05:00Z',
    status: 'PAID',
    kind: 'ACTIVATION',
    planCode: 'WEDDING_PLUS',
    eventId: 'e-1',
    eventTitle: 'Maria & Nikos',
    eventPurged: false,
    buyerId: 'u-1',
    buyerName: 'Maria P.',
    buyerEmail: 'maria@example.com',
    buyerType: 'CONSUMER',
    amountMinor: 4900,
    currency: 'EUR',
    provider: 'STRIPE',
    comp: false,
    disputeOpen: false,
    refundedAt: null,
    refundedAmountMinor: null,
    refundSource: null,
};

// A refunded order whose buyer deleted the account and whose event was purged.
const refunded: AdminOrderSummaryDto = {
    ...paid,
    id: 'o-2',
    status: 'REFUNDED',
    eventTitle: 'Old party',
    eventPurged: true,
    buyerId: null,
    buyerName: null,
    buyerEmail: null,
    disputeOpen: true,
    refundedAt: '2026-09-29T10:00:00Z',
    refundedAmountMinor: 2000,
    refundSource: 'WITHDRAWAL',
};

function renderTable(orders: AdminOrderSummaryDto[]) {
    render(
        <NextIntlClientProvider locale="en" messages={messages} timeZone="UTC">
            <OrdersTable orders={orders} />
        </NextIntlClientProvider>,
    );
}

afterEach(cleanup);

describe('OrdersTable', () => {
    it('shows a paid order and links its row to the order page', () => {
        renderTable([paid]);

        expect(screen.getByText('Maria & Nikos')).toBeInTheDocument();
        expect(screen.getByText('Maria P.')).toBeInTheDocument();
        expect(screen.getByText('maria@example.com')).toBeInTheDocument();
        expect(screen.getByText('Activation')).toBeInTheDocument();
        expect(screen.getByText('€49.00')).toBeInTheDocument();
        expect(screen.getByText('Paid')).toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'Open order for Maria & Nikos' })).toHaveAttribute('href', '#orders/o-1');
    });

    it('shows a deleted account, a purged event, the refund and the open dispute', () => {
        renderTable([refunded]);

        expect(screen.getByText('Deleted account')).toBeInTheDocument();
        expect(screen.getByText('Deleted')).toBeInTheDocument();
        expect(screen.getByText('€20.00 refunded')).toBeInTheDocument();
        expect(screen.getByText('Refunded')).toBeInTheDocument();
        expect(screen.getByText('Disputed')).toBeInTheDocument();
    });
});
