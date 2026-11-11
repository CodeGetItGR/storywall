import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { campaignDetailFixture, campaignDetailForMarketingFixture, campaignListFixture } from '@/components/admin/campaigns/__fixtures__/campaigns';
import { CampaignPage } from '@/components/admin/campaigns/CampaignPage';
import type { CampaignDrawers } from '@/hooks/useCampaignsPage';
import type { useFunnelRange } from '@/hooks/useFunnelRange';
import { funnelRangeBounds } from '@/lib/adminFunnel';
import { ApiError } from '@/lib/api/client';
import type { CampaignDetailDto } from '@/lib/api/types';
import type { CampaignTab } from '@/lib/campaignCompare';
import messages from '@/messages/en.json';

// The Back link reads the App Router.
vi.mock('next/navigation', () => ({ usePathname: () => '/admin', useRouter: () => ({ back: vi.fn() }) }));

const queries = vi.hoisted(() => ({ detail: undefined as CampaignDetailDto | undefined, error: null as unknown }));
vi.mock('@/hooks/useAdminCampaignApi', async () => ({
    ...(await import('@/components/admin/campaigns/__fixtures__/campaignWrites')).idleCampaignWrites(),
    useCampaignDetailQuery: () => ({
        data: queries.detail,
        isLoading: false,
        isFetching: false,
        error: queries.error,
        dataUpdatedAt: 0,
        refetch: vi.fn(),
    }),
    useCampaignListQuery: () => ({ data: campaignListFixture, isLoading: false, isFetching: false, error: null, dataUpdatedAt: 0, refetch: vi.fn() }),
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

const drawers = {
    drawer: null,
    token: 0,
    openEdit: vi.fn(),
    openLinks: vi.fn(),
    close: vi.fn(),
    handleDeleted: vi.fn(),
} satisfies CampaignDrawers;

function tabHref(tab: CampaignTab) {
    return tab === 'past' ? '#campaigns/past' : '#campaigns';
}

function renderPage(onNotFound = vi.fn()) {
    render(
        <NextIntlClientProvider locale="en" messages={messages} timeZone="UTC">
            <CampaignPage
                id="launch"
                range={range}
                tabHref={tabHref}
                drawers={drawers}
                canEditDiscount
                onBackAction={vi.fn()}
                onNotFoundAction={onNotFound}
            />
        </NextIntlClientProvider>,
    );
    return onNotFound;
}

function section(title: string) {
    const heading = screen.getByRole('heading', { name: title });
    const found = heading.closest('section');
    if (!found) throw new Error(`No section for ${title}`);
    return found;
}

describe('CampaignPage', () => {
    beforeEach(() => {
        queries.detail = campaignDetailFixture;
        queries.error = null;
    });
    afterEach(cleanup);

    it('shows the campaign and its funnel from visitors to paid', () => {
        renderPage();

        expect(screen.getByRole('heading', { level: 1, name: 'Launch 50%' })).toBeInTheDocument();
        const funnel = section('Funnel');
        expect(within(funnel).getByText('1,240')).toBeInTheDocument();
        expect(within(funnel).getByText('64')).toBeInTheDocument();
        expect(within(funnel).getByText('Revenue')).toBeInTheDocument();
    });

    it('opens Instagram to its four links, without repeating the platform', () => {
        renderPage();
        const instagram = screen.getByRole('button', { name: 'Instagram' });

        expect(instagram).toHaveAttribute('aria-expanded', 'false');
        expect(screen.queryAllByTestId('platform-link')).toHaveLength(0);

        fireEvent.click(instagram);

        const lines = screen.getAllByTestId('platform-link');
        expect(lines).toHaveLength(4);
        expect(within(lines[0]).queryByRole('button', { name: 'Instagram' })).not.toBeInTheDocument();
    });

    it("shows a platform's name on a tap of its toggle, which still opens it", () => {
        renderPage();
        const instagram = screen.getByRole('button', { name: 'Instagram' });

        fireEvent.pointerUp(instagram, { pointerType: 'touch' });
        expect(screen.getByText('Instagram')).toHaveAttribute('aria-hidden', 'true');

        fireEvent.click(instagram);
        expect(instagram).toHaveAttribute('aria-expanded', 'true');
    });

    it("doesn't open a platform with one link, and says when one has no visits", () => {
        renderPage();

        // A platform that doesn't open is its icon alone, which still shows its name on a tap.
        expect(screen.getByRole('button', { name: 'Facebook' })).not.toHaveAttribute('aria-expanded');
        expect(screen.getByRole('button', { name: 'Partner' })).not.toHaveAttribute('aria-expanded');
        expect(screen.getByText('No visits yet')).toBeInTheDocument();
    });

    it('leaves revenue out for marketing', () => {
        queries.detail = campaignDetailForMarketingFixture;
        renderPage();

        expect(within(section('Funnel')).queryByText('Revenue')).not.toBeInTheDocument();
    });

    it('goes back to the tab that lists it', () => {
        queries.detail = { ...campaignDetailFixture, campaign: { ...campaignDetailFixture.campaign, status: 'ENDED' } };
        renderPage();

        expect(screen.getByRole('link', { name: 'All campaigns' })).toHaveAttribute('href', '#campaigns/past');
    });

    it('goes back to the list when the campaign no longer exists', () => {
        queries.detail = undefined;
        queries.error = new ApiError(404, {});
        const onNotFound = renderPage();

        expect(onNotFound).toHaveBeenCalled();
    });

    it('opens its links and its edit drawer from the header', () => {
        renderPage();

        fireEvent.click(screen.getByRole('button', { name: 'Links (8)' }));
        fireEvent.click(screen.getByRole('button', { name: 'Edit' }));

        expect(drawers.openLinks).toHaveBeenCalled();
        expect(drawers.openEdit).toHaveBeenCalled();
    });
});
