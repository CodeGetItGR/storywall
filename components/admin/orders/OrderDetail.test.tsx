import { cleanup, render, screen, within } from '@testing-library/react';
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
        taxLines: [],
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
        receiptNumber: null,
        receiptUrl: null,
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

function activityItems() {
    const activity = screen.getByRole('heading', { name: 'Activity' }).closest('section');
    return within(activity as HTMLElement).getAllByRole('listitem');
}

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
        expect(screen.getByText('DE')).toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'Open in Stripe' })).toHaveAttribute('href', 'https://dashboard.stripe.com/payments/pi_1');
        // No fraud facts recorded, so no collapsed block for them.
        expect(screen.queryByText('Fraud signals')).not.toBeInTheDocument();
    });

    it('sums the order up in the header: event, what was bought and the time it covers', () => {
        renderDetail({
            ...order,
            coverage: { ...order.coverage, coverageStartsAt: '2026-09-28T10:05:00Z', coverageEndsAt: '2027-09-28T10:05:00Z' },
        });

        expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('€49.00');
        expect(screen.getByText('Maria & Nikos')).toBeInTheDocument();
        expect(screen.getByText('WEDDING_PLUS')).toBeInTheDocument();
        expect(screen.getByText('Sep 28, 2026 → Sep 28, 2027')).toBeInTheDocument();
    });

    it('shows only the order id; the others are copy-only', () => {
        renderDetail(order);

        expect(screen.getByText('o-1')).toBeInTheDocument();
        for (const id of ['u-1', 'cus_1', 'pi_1', 'cs_1', 're_1', 'e-1']) {
            expect(screen.queryByText(id)).not.toBeInTheDocument();
        }
        expect(screen.getAllByRole('button', { name: /^Copy / })).toHaveLength(7);
    });

    it('lists what happened in order, with a refund made before amounts were recorded and a held withdrawal linked to its review', () => {
        renderDetail(order);

        const [placed, paid, withdrawal, refund, ...rest] = activityItems();
        expect(placed).toHaveTextContent('Order placed');
        expect(paid).toHaveTextContent('Paid');
        expect(withdrawal).toHaveTextContent('Withdrawal requested · Whole event');
        expect(refund).toHaveTextContent('Refunded (amount not recorded)');
        expect(rest).toHaveLength(0);
        expect(screen.getByText('This order: €20.00')).toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'Review' })).toHaveAttribute('href', '#withdrawals/w-1');
    });

    it('breaks the tax down by rate, naming the reasons it knows and showing the others as Stripe sent them', () => {
        renderDetail({
            ...order,
            pricing: {
                ...order.pricing,
                taxAmountMinor: 948,
                taxLines: [
                    {
                        amountMinor: 948,
                        taxableAmountMinor: 3952,
                        ratePercent: 24,
                        country: 'GR',
                        jurisdiction: 'Greece',
                        taxType: 'vat',
                        taxabilityReason: 'standard_rated',
                        inclusive: true,
                    },
                    {
                        amountMinor: 0,
                        taxableAmountMinor: null,
                        ratePercent: null,
                        country: 'DE',
                        jurisdiction: null,
                        taxType: null,
                        taxabilityReason: 'some_new_reason',
                        inclusive: null,
                    },
                ],
            },
        });

        expect(screen.getByText('€9.48', { selector: 'span.font-semibold' })).toBeInTheDocument();
        expect(screen.getByText('24% · GR · Standard rate')).toBeInTheDocument();
        expect(screen.getByText('DE · some_new_reason')).toBeInTheDocument();
    });

    it('shows the tax total alone while its breakdown has not arrived', () => {
        renderDetail({ ...order, pricing: { ...order.pricing, taxAmountMinor: 948 } });

        const price = screen.getByRole('heading', { name: 'Price' }).closest('section') as HTMLElement;
        expect(within(price).getByText('Tax')).toBeInTheDocument();
        // Only the checkout line; no rate lines under the total.
        expect(within(price).getAllByRole('listitem')).toHaveLength(1);
    });

    it("links Stripe's receipt, by number once Stripe has issued one", () => {
        const receiptUrl = 'https://pay.stripe.com/receipts/r_1';
        renderDetail({ ...order, payment: { ...order.payment, receiptUrl, receiptNumber: '1234-5678' } });

        const link = screen.getByRole('link', { name: '#1234-5678' });
        expect(link).toHaveAttribute('href', receiptUrl);
        expect(link).toHaveAttribute('target', '_blank');
        expect(link).toHaveAttribute('rel', 'noopener noreferrer');
        cleanup();

        renderDetail({ ...order, payment: { ...order.payment, receiptUrl, receiptNumber: null } });
        expect(screen.getByRole('link', { name: 'View' })).toHaveAttribute('href', receiptUrl);
    });

    it('has no receipt row without a receipt', () => {
        renderDetail(order);

        expect(screen.queryByText('Stripe receipt')).not.toBeInTheDocument();
    });

    it('leaves out what did not happen', () => {
        renderDetail({ ...order, refund: null, withdrawals: [], payment: { ...order.payment, riskLevel: 'normal' } });

        expect(activityItems()).toHaveLength(2);
        expect(screen.getByText('Fraud signals')).toBeInTheDocument();
    });
});
