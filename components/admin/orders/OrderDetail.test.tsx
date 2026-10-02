import { cleanup, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it } from 'vitest';

import { OrderDetail } from '@/components/admin/orders/OrderDetail';
import type { AdminOrderDetailDto } from '@/lib/api/types';
import messages from '@/messages/en.json';

const order: AdminOrderDetailDto = {
    summary: {
        id: 'o-1',
        createdAt: '2026-09-28T10:00:00Z',
        paidAt: '2026-09-28T10:05:00Z',
        status: 'REFUNDED',
        kind: 'ACTIVATION',
        planCode: 'WEDDING_PLUS',
        eventId: 'e-1',
        eventTitle: 'Maria & Nikos',
        eventPurged: false,
        buyerId: 'u-1',
        buyerName: 'Acme Events',
        buyerEmail: 'billing@acme.example',
        buyerType: 'BUSINESS',
        amountMinor: 4900,
        currency: 'EUR',
        provider: 'STRIPE',
        comp: false,
        disputeOpen: false,
        refundedAt: '2026-09-29T10:00:00Z',
        refundedAmountMinor: null,
        refundSource: 'WITHDRAWAL',
    },
    buyer: {
        userId: 'u-1',
        name: 'Acme Events',
        email: 'billing@acme.example',
        buyerType: 'BUSINESS',
        businessSnapshot: { legalName: 'Acme Events', vatNumber: 'EL123456789', city: 'Athens' },
        providerCustomerId: 'cus_1',
    },
    pricing: {
        amountMinor: 4900,
        currency: 'EUR',
        addonAmountMinor: null,
        setupAmountMinor: null,
        eventDayAmountMinor: null,
        hostingAmountMinor: null,
        taxAmountMinor: null,
        discountLabel: 'SPRING10',
        checkoutDescription: null,
        checkoutFooterMessage: null,
        priceBreakdown: null,
        checkoutLines: [{ name: 'Wedding Plus', description: 'Gallery and RSVP', amountMinor: 4900 }],
    },
    coverage: {
        planCode: 'WEDDING_PLUS',
        paidServiceCode: null,
        coverageOptionId: 'c-1',
        upgradeFromOptionId: null,
        coverageMonths: 12,
        coverageMonthsAdded: null,
        coverageStartsAt: null,
        coverageEndsAt: null,
    },
    payment: {
        provider: 'STRIPE',
        providerSessionId: 'cs_1',
        providerPaymentId: 'pi_1',
        billingCountry: 'GR',
        cardCountry: 'DE',
        cardFingerprint: null,
        riskLevel: null,
        disputedAt: null,
        disputeClosedAt: null,
    },
    refund: { refundedAt: '2026-09-29T10:00:00Z', amountMinor: null, source: 'WITHDRAWAL', providerRefundId: 're_1' },
    consent: { termsVersion: '2026-09', immediateStartAt: null, acknowledgedAt: null },
    settledBy: null,
    withdrawals: [
        {
            id: 'w-1',
            scope: 'EVENT',
            status: 'HELD',
            createdAt: '2026-09-29T09:00:00Z',
            decidedAt: null,
            reason: 'Wedding cancelled',
            decisionNote: null,
            totalRefundMinor: 2000,
            line: { basis: 'CONSENTED_PRO_RATA', refundMinor: 2000, providerRefunded: false, eventPerformed: false },
        },
    ],
    commissions: [],
};

function renderDetail(detail: AdminOrderDetailDto) {
    render(
        <NextIntlClientProvider locale="en" messages={messages} timeZone="UTC">
            <OrderDetail order={detail} />
        </NextIntlClientProvider>,
    );
}

afterEach(cleanup);

describe('OrderDetail', () => {
    it('shows the business the order was sold under, the checkout lines and the payment', () => {
        renderDetail(order);

        expect(screen.getByText('EL123456789')).toBeInTheDocument();
        expect(screen.getByText('Wedding Plus')).toBeInTheDocument();
        expect(screen.getByText('SPRING10')).toBeInTheDocument();
        expect(screen.getByText('No tax added; prices include VAT.')).toBeInTheDocument();
        expect(screen.getByText('12 months')).toBeInTheDocument();
        expect(screen.getByText('DE')).toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'Open in Stripe' })).toHaveAttribute('href', 'https://dashboard.stripe.com/payments/pi_1');
        // No fraud facts recorded, so no collapsed block for them.
        expect(screen.queryByText('Fraud signals')).not.toBeInTheDocument();
    });

    it('shows a refund made before amounts were recorded, and links a held withdrawal to its review', () => {
        renderDetail(order);

        expect(screen.getByText('Not recorded')).toBeInTheDocument();
        expect(screen.getByText('This order: €20.00')).toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'Review' })).toHaveAttribute('href', '#withdrawals/w-1');
    });

    it('leaves out sections with nothing in them', () => {
        renderDetail({ ...order, refund: null, withdrawals: [], payment: { ...order.payment, riskLevel: 'normal' } });

        expect(screen.queryByText('Refund')).not.toBeInTheDocument();
        expect(screen.queryByText('Withdrawals')).not.toBeInTheDocument();
        expect(screen.queryByText('Commission')).not.toBeInTheDocument();
        expect(screen.getByText('Fraud signals')).toBeInTheDocument();
    });
});
