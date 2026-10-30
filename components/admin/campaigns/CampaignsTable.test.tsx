import { cleanup, render, screen, within } from '@testing-library/react';
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
        ]);
        const cells = within(screen.getAllByRole('row')[1])
            .getAllByRole('cell')
            .map((cell) => cell.textContent);
        expect(cells.slice(3, 8)).toEqual(['620', '510', '88', '40', '12']);
    });

    it('drops the revenue column for marketing, who get revenue as null', () => {
        render(
            <NextIntlClientProvider locale="en" messages={messages} timeZone="UTC">
                <CampaignsTable rows={[{ ...ROW, revenueMinorByCurrency: null }]} onLinkAction={vi.fn()} />
            </NextIntlClientProvider>,
        );

        const headers = screen.getAllByRole('columnheader').map((cell) => cell.textContent);
        expect(headers).not.toContain('Revenue');
        expect(within(screen.getAllByRole('row')[1]).getAllByRole('cell')).toHaveLength(headers.length);
    });
});
