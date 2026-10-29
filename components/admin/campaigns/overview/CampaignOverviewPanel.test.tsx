import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { campaignOverviewFixture, emptyCampaignOverviewFixture } from '@/components/admin/campaigns/__fixtures__/campaignOverview';
import { CampaignOverviewPanel } from '@/components/admin/campaigns/overview/CampaignOverviewPanel';
import messages from '@/messages/en.json';

const apiGet = vi.fn();
vi.mock('@/lib/api/client', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@/lib/api/client')>()),
    api: { get: (...args: unknown[]) => apiGet(...args) },
}));

class InertResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
}

function renderPanel() {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return render(
        <QueryClientProvider client={client}>
            <NextIntlClientProvider locale="en" messages={messages} timeZone="UTC">
                <CampaignOverviewPanel />
            </NextIntlClientProvider>
        </QueryClientProvider>,
    );
}

beforeEach(() => {
    vi.stubGlobal('ResizeObserver', InertResizeObserver);
    apiGet.mockReset();
});

afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
});

describe('CampaignOverviewPanel', () => {
    it('shows the funnel tiles, the daily chart and the splits for every link', async () => {
        apiGet.mockResolvedValue(campaignOverviewFixture);
        renderPanel();

        expect(await screen.findByText('Create clicks')).toBeTruthy();
        expect(apiGet).toHaveBeenCalledWith('/api/admin/metrics/campaigns/overview');
        expect(screen.getByText('1,240')).toBeTruthy();
        expect(screen.getAllByText(/of visitors$/)).toHaveLength(5);
        expect(screen.getByText(messages.AdminPage.visitors.daily.title)).toBeTruthy();
        expect(screen.getByText('Language and device')).toBeTruthy();
        expect(screen.getByText('Greek')).toBeTruthy();
    });

    it('keeps the tiles and says so when there are no visits', async () => {
        apiGet.mockResolvedValue(emptyCampaignOverviewFixture);
        renderPanel();

        expect(await screen.findByText('No campaign visits in this range.')).toBeTruthy();
        expect(screen.getByText('Sign-ups')).toBeTruthy();
        expect(screen.queryByText('Language and device')).toBeNull();
    });

    it('offers a retry after an error', async () => {
        apiGet.mockRejectedValue(new Error('down'));
        renderPanel();

        await waitFor(() => expect(screen.getByText("Couldn't load the campaign overview.")).toBeTruthy());
        expect(screen.getByRole('button', { name: 'Try again' })).toBeTruthy();
    });
});
