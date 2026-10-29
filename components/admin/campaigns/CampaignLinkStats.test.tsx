import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { campaignOverviewFixture } from '@/components/admin/campaigns/__fixtures__/campaignOverview';
import { CampaignLinkStats } from '@/components/admin/campaigns/CampaignLinkStats';
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

beforeEach(() => {
    vi.stubGlobal('ResizeObserver', InertResizeObserver);
    apiGet.mockReset();
});

afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
});

describe('CampaignLinkStats', () => {
    it("asks for this link's overview in the table's range", async () => {
        apiGet.mockResolvedValue(campaignOverviewFixture);
        render(
            <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
                <NextIntlClientProvider locale="en" messages={messages} timeZone="UTC">
                    <CampaignLinkStats linkId="l1" bounds={{ since: '2027-03-01T00:00:00.000+02:00', until: null, isValid: true }} />
                </NextIntlClientProvider>
            </QueryClientProvider>,
        );

        expect(await screen.findByText('Create clicks')).toBeTruthy();
        expect(apiGet).toHaveBeenCalledWith(
            `/api/admin/metrics/campaigns/overview?since=${encodeURIComponent('2027-03-01T00:00:00.000+02:00')}&link=l1`,
        );
    });
});
