import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { CampaignsTable } from '@/components/admin/campaigns/CampaignsTable';
import type { CampaignRowDto } from '@/lib/api/types';
import messages from '@/messages/en.json';

const ROW: CampaignRowDto = {
    utmSource: 'instagram',
    utmMedium: 'social',
    utmCampaign: 'spring',
    link: {
        id: 'l1',
        name: 'Spring bio',
        destinationPath: '/',
        utmSource: 'instagram',
        utmMedium: 'social',
        utmCampaign: 'spring',
        createdAt: '2027-03-01T10:00:00Z',
    },
    visits: 620,
    visitors: 510,
    createClicks: 88,
    plansClicks: 40,
    planPicks: 12,
    signedUp: 21,
    createdEvent: 9,
    paidHost: 5,
    revenueMinorByCurrency: { EUR: 72000 },
    sales: 3,
    salesRevenueMinorByCurrency: { EUR: 14_700 },
};

afterEach(cleanup);

describe('CampaignsTable', () => {
    it('shows the visit columns before Sign-ups', () => {
        render(
            <NextIntlClientProvider locale="en" messages={messages} timeZone="UTC">
                <CampaignsTable rows={[ROW]} onLinkAction={vi.fn()} />
            </NextIntlClientProvider>,
        );

        const headers = screen.getAllByRole('columnheader').map((cell) => cell.textContent);
        expect(headers).toEqual([
            'Name',
            'Source / medium',
            'Campaign',
            'Visits',
            'Visitors',
            'Create',
            'Plans',
            'Plan picked',
            'Sign-ups',
            'Created an event',
            'Paid',
            'Revenue',
            'Sales',
            'Sales revenue',
        ]);
        const cells = within(screen.getAllByRole('row')[1])
            .getAllByRole('cell')
            .map((cell) => cell.textContent);
        expect(cells.slice(3, 8)).toEqual(['620', '510', '88', '40', '12']);
    });

    it('drops the revenue column for marketing, who get revenue as null', () => {
        render(
            <NextIntlClientProvider locale="en" messages={messages} timeZone="UTC">
                <CampaignsTable rows={[{ ...ROW, revenueMinorByCurrency: null, salesRevenueMinorByCurrency: null }]} onLinkAction={vi.fn()} />
            </NextIntlClientProvider>,
        );

        const headers = screen.getAllByRole('columnheader').map((cell) => cell.textContent);
        expect(headers).not.toContain('Revenue');
        expect(headers).not.toContain('Sales revenue');
        expect(headers).toContain('Sales');
        expect(headers.slice(-2)).toEqual(['Paid', 'Sales']);
        expect(within(screen.getAllByRole('row')[1]).getAllByRole('cell')).toHaveLength(headers.length);
    });

    it('has no tip for revenue or sales revenue for marketing, but keeps the others', () => {
        render(
            <NextIntlClientProvider locale="en" messages={messages} timeZone="UTC">
                <CampaignsTable rows={[{ ...ROW, revenueMinorByCurrency: null, salesRevenueMinorByCurrency: null }]} onLinkAction={vi.fn()} />
            </NextIntlClientProvider>,
        );

        expect(screen.queryByRole('button', { name: 'What Revenue means' })).toBeNull();
        expect(screen.queryByRole('button', { name: 'What Sales revenue means' })).toBeNull();
        expect(screen.getByRole('button', { name: 'What Sales means' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'What Paid means' })).toBeInTheDocument();
    });

    it('puts a tip on every value column, with its description on tap', () => {
        render(
            <NextIntlClientProvider locale="en" messages={messages} timeZone="UTC">
                <CampaignsTable rows={[ROW]} onLinkAction={vi.fn()} />
            </NextIntlClientProvider>,
        );

        expect(screen.getAllByRole('button', { name: /^What .* means$/ })).toHaveLength(11);
        fireEvent.click(screen.getByRole('button', { name: 'What Sales means' }));
        expect(screen.getByRole('tooltip')).toHaveTextContent("Paid orders where this was the buyer's last link. Existing accounts count too.");
    });

    it('shows sales and their revenue', () => {
        render(
            <NextIntlClientProvider locale="en" messages={messages} timeZone="UTC">
                <CampaignsTable rows={[ROW]} onLinkAction={vi.fn()} />
            </NextIntlClientProvider>,
        );

        const cells = within(screen.getAllByRole('row')[1])
            .getAllByRole('cell')
            .map((cell) => cell.textContent);
        expect(cells.slice(10, 14)).toEqual(['5', '€720.00', '3', '€147.00']);
    });
});
