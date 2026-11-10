import { cleanup, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { campaignDetailFixture, campaignListFixture } from '@/components/admin/campaigns/__fixtures__/campaigns';
import { CampaignsPanel } from '@/components/admin/campaigns/CampaignsPanel';
import messages from '@/messages/en.json';

// A campaign's Back link reads the App Router.
vi.mock('next/navigation', () => ({ usePathname: () => '/admin', useRouter: () => ({ back: vi.fn() }) }));

vi.mock('@/hooks/useAdminCampaignApi', () => ({
    useCampaignDetailQuery: () => ({
        data: campaignDetailFixture,
        isLoading: false,
        isFetching: false,
        error: null,
        dataUpdatedAt: 0,
        refetch: vi.fn(),
    }),
    useCampaignListQuery: () => ({ data: campaignListFixture, isLoading: false, isFetching: false, error: null, dataUpdatedAt: 0, refetch: vi.fn() }),
}));

function renderPanel() {
    return render(
        <NextIntlClientProvider locale="en" messages={messages} timeZone="UTC">
            <CampaignsPanel />
        </NextIntlClientProvider>,
    );
}

describe('CampaignsPanel', () => {
    beforeEach(() => window.history.replaceState(null, '', '/admin#campaigns'));
    afterEach(cleanup);

    it('opens on the current campaigns for the last 30 days', () => {
        renderPanel();

        expect(screen.getByRole('button', { name: 'Last 30 days', pressed: true })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Current', pressed: true })).toBeInTheDocument();
    });

    it('opens on Past from its address', () => {
        window.history.replaceState(null, '', '/admin#campaigns/past');
        renderPanel();

        expect(screen.getByRole('button', { name: 'Past', pressed: true })).toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'Spring 20%' })).toBeInTheDocument();
    });

    it('opens a campaign from its address', () => {
        window.history.replaceState(null, '', '/admin#campaigns/launch');
        renderPanel();

        expect(screen.getByRole('heading', { level: 1, name: 'Launch 50%' })).toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'All campaigns' })).toHaveAttribute('href', '#campaigns');
    });
});
