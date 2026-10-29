import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
    campaignOverviewFixture,
    campaignReportFixture,
    emptyCampaignOverviewFixture,
    oneDayCampaignOverviewFixture,
} from '@/components/admin/campaigns/__fixtures__/campaignOverview';
import { CampaignOverviewPanel } from '@/components/admin/campaigns/overview/CampaignOverviewPanel';
import type { CampaignOverviewDto } from '@/lib/api/types';
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

// The overview answers with `overview`; the per-campaign report always with the report fixture.
function answer(overview: CampaignOverviewDto) {
    apiGet.mockImplementation((url: string) =>
        Promise.resolve(url.startsWith('/api/admin/metrics/campaigns/overview') ? overview : campaignReportFixture),
    );
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
    it('shows the funnel tiles, the daily chart, the sources, the pages and the splits for every link', async () => {
        answer(campaignOverviewFixture);
        renderPanel();

        expect(await screen.findByText('Create clicks')).toBeTruthy();
        expect(apiGet).toHaveBeenCalledWith('/api/admin/metrics/campaigns/overview');
        expect(screen.getByText('1,240')).toBeTruthy();
        expect(screen.getAllByText(/of visitors$/)).toHaveLength(5);
        expect(screen.getByText(messages.AdminPage.visitors.daily.title)).toBeTruthy();
        expect(await screen.findByRole('table', { name: 'By source' })).toBeTruthy();
        expect(screen.getByText('Landing page')).toBeTruthy();
        expect(screen.getByText('/for-business')).toBeTruthy();
        expect(screen.getByText('Unknown')).toBeTruthy();
        expect(screen.getByText('Language and device')).toBeTruthy();
        expect(screen.getByText('Greek')).toBeTruthy();
    });

    it('opens a source into its campaigns', async () => {
        answer(campaignOverviewFixture);
        renderPanel();

        const instagram = await screen.findByRole('button', { name: /instagram/ });
        expect(screen.queryByText('Spring story')).toBeNull();

        fireEvent.click(instagram);

        expect(instagram.getAttribute('aria-expanded')).toBe('true');
        expect(screen.getByText('Spring story')).toBeTruthy();
        expect(screen.getByText('Spring bio')).toBeTruthy();
    });

    it('narrows everything to the picked source', async () => {
        answer(campaignOverviewFixture);
        renderPanel();

        const picker = await screen.findByRole('combobox', { name: 'Source' });
        await screen.findByRole('option', { name: 'facebook' });
        fireEvent.change(picker, { target: { value: 'facebook' } });

        await waitFor(() => expect(apiGet).toHaveBeenCalledWith('/api/admin/metrics/campaigns/overview?source=facebook'));
        expect(await screen.findByRole('table', { name: 'By campaign' })).toBeTruthy();
        expect(screen.getByText('Spring post')).toBeTruthy();
        expect(screen.queryByText('Spring bio')).toBeNull();
    });

    it('shows visitors by hour for a one-day range', async () => {
        answer(oneDayCampaignOverviewFixture);
        renderPanel();

        expect(await screen.findByText('Visitors by hour')).toBeTruthy();
        expect(screen.queryByText(messages.AdminPage.visitors.daily.title)).toBeNull();
    });

    it('keeps the tiles and says so when there are no visits', async () => {
        answer(emptyCampaignOverviewFixture);
        renderPanel();

        expect(await screen.findByText('No campaign visits in this range.')).toBeTruthy();
        expect(screen.getByText('Sign-ups')).toBeTruthy();
        expect(screen.queryByText('Language and device')).toBeNull();
        expect(screen.queryByText('By source')).toBeNull();
    });

    it('offers a retry after an error', async () => {
        apiGet.mockRejectedValue(new Error('down'));
        renderPanel();

        await waitFor(() => expect(screen.getByText("Couldn't load the campaign overview.")).toBeTruthy());
        expect(screen.getByRole('button', { name: 'Try again' })).toBeTruthy();
    });
});
