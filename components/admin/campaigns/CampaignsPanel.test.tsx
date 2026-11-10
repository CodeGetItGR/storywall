import { cleanup, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { campaignListFixture } from '@/components/admin/campaigns/__fixtures__/campaigns';
import { CampaignsPanel } from '@/components/admin/campaigns/CampaignsPanel';
import messages from '@/messages/en.json';

vi.mock('@/hooks/useAdminCampaignApi', () => ({
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
});
