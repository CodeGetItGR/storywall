import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { CampaignsPanel } from '@/components/admin/campaigns/CampaignsPanel';
import { CampaignLinkSetDrawer } from '@/components/admin/campaigns/CampaignLinkSetDrawer';
import messages from '@/messages/en.json';

vi.mock('@/hooks/useAdminCampaigns', () => ({
    useAdminCampaigns: () => ({ data: [], isLoading: false, isFetching: false, error: null, dataUpdatedAt: 0, refetch: vi.fn() }),
    useGenerateCampaignLinkSet: () => ({ mutateAsync: vi.fn(), isPending: false }),
    useCreateCampaignLink: () => ({ mutateAsync: vi.fn(), isPending: false }),
    useRenameCampaignLink: () => ({ mutateAsync: vi.fn(), isPending: false }),
    useDeleteCampaignLink: () => ({ mutateAsync: vi.fn(), isPending: false }),
    useAdminCampaignOverview: () => ({ data: undefined, isLoading: false, error: null }),
}));

vi.mock('@/components/admin/campaigns/CampaignLinkSetDrawer', () => ({
    CampaignLinkSetDrawer: vi.fn(() => null),
}));
vi.mock('@/components/admin/campaigns/CampaignLinkCreateDrawer', () => ({ CampaignLinkCreateDrawer: () => null }));
vi.mock('@/components/admin/campaigns/CampaignLinkDrawer', () => ({ CampaignLinkDrawer: () => null }));

function lastDrawerProps() {
    const calls = vi.mocked(CampaignLinkSetDrawer).mock.calls;
    return calls[calls.length - 1][0];
}

describe('CampaignsPanel link set buttons', () => {
    afterEach(() => {
        cleanup();
        vi.mocked(CampaignLinkSetDrawer).mockClear();
    });

    it.each([
        ['English links', 'en'],
        ['Greek links', 'el'],
    ])('opens the set drawer for the language of the %s button', (name, language) => {
        render(
            <NextIntlClientProvider locale="en" messages={messages} timeZone="UTC">
                <CampaignsPanel />
            </NextIntlClientProvider>,
        );
        expect(lastDrawerProps().open).toBe(false);

        fireEvent.click(screen.getByRole('button', { name }));

        expect(lastDrawerProps()).toMatchObject({ open: true, language });
    });
});
