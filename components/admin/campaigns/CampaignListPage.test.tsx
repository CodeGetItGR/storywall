import { cleanup, render, screen, within } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { campaignListFixture, campaignListForMarketingFixture, emptyCampaignListFixture } from '@/components/admin/campaigns/__fixtures__/campaigns';
import { CampaignListPage } from '@/components/admin/campaigns/CampaignListPage';
import type { useFunnelRange } from '@/hooks/useFunnelRange';
import { funnelRangeBounds } from '@/lib/adminFunnel';
import type { CampaignListDto } from '@/lib/api/types';
import type { CampaignTab } from '@/lib/campaignCompare';
import messages from '@/messages/en.json';

const query = vi.hoisted(() => ({ data: undefined as CampaignListDto | undefined }));
vi.mock('@/hooks/useAdminCampaignApi', () => ({
    useCampaignListQuery: () => ({ data: query.data, isLoading: false, isFetching: false, error: null, dataUpdatedAt: 0, refetch: vi.fn() }),
}));

const range = {
    preset: 'LAST_30',
    setPreset: vi.fn(),
    custom: { from: '', to: '' },
    today: '2026-06-15',
    bounds: funnelRangeBounds('ALL', { from: '', to: '' }, '2026-06-15'),
    handleFromChange: vi.fn(),
    handleToChange: vi.fn(),
} as unknown as ReturnType<typeof useFunnelRange>;

function renderPage(tab: CampaignTab = 'current') {
    return render(
        <NextIntlClientProvider locale="en" messages={messages} timeZone="UTC">
            <CampaignListPage
                range={range}
                tab={tab}
                onTabChangeAction={vi.fn()}
                onNewCampaignAction={vi.fn()}
                onRecordLinkClickAction={vi.fn()}
                onRecordRowClickAction={vi.fn()}
            />
        </NextIntlClientProvider>,
    );
}

function rowNames() {
    return screen.getAllByTestId('campaign-row').map((row) => within(row).getByRole('link').textContent);
}

describe('CampaignListPage', () => {
    beforeEach(() => {
        query.data = campaignListFixture;
    });
    afterEach(cleanup);

    it('lists current campaigns: live with dates, then scheduled, then undated', () => {
        renderPage('current');

        expect(rowNames()).toEqual(['Launch 50%', 'Wedding fair', 'Autumn posts', 'TikTok test']);
    });

    it('lists ended and archived campaigns under Past, latest first', () => {
        renderPage('past');

        // Archived 2 May, then ended 30 April.
        expect(rowNames()).toEqual(['October bio link', 'Spring 20%']);
    });

    it('shows the four summary tiles, with revenue for an admin', () => {
        renderPage();

        const summary = screen.getByRole('region', { name: 'Campaigns' });
        expect(within(summary).getByText('Revenue')).toBeInTheDocument();
        expect(within(summary).getByText('1,949')).toBeInTheDocument();
    });

    it('leaves revenue out for marketing', () => {
        query.data = campaignListForMarketingFixture;
        renderPage();

        expect(within(screen.getByRole('region', { name: 'Campaigns' })).queryByText('Revenue')).not.toBeInTheDocument();
    });

    it('says when there are no campaigns', () => {
        query.data = emptyCampaignListFixture;
        renderPage('current');

        expect(screen.getByText('No campaigns yet.')).toBeInTheDocument();
    });

    it('says when nothing is past', () => {
        query.data = { ...campaignListFixture, items: campaignListFixture.items.filter((item) => item.campaign.status === 'LIVE') };
        renderPage('past');

        expect(screen.getByText('No past campaigns.')).toBeInTheDocument();
    });
});
