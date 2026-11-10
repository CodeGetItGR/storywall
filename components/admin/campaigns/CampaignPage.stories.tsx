import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { delay, http, HttpResponse } from 'msw';
import { expect, userEvent, within } from 'storybook/test';

import { withAdminShell } from '@/.storybook/admin';
import { copyFor } from '@/.storybook/copy';
import {
    campaignDetailAllTimeFixture,
    campaignDetailFixture,
    campaignDetailForMarketingFixture,
    campaignListFixture,
    campaignListForMarketingFixture,
} from '@/components/admin/campaigns/__fixtures__/campaigns';
import { CampaignsPanel } from '@/components/admin/campaigns/CampaignsPanel';

const LIST_URL = '*/api/admin/campaigns';
const DETAIL_URL = '*/api/admin/campaigns/launch';

const meta = {
    title: 'Admin/Campaigns/Campaign',
    component: CampaignsPanel,
    decorators: [withAdminShell],
    beforeEach() {
        window.history.replaceState(null, '', '/admin#campaigns/launch');
    },
} satisfies Meta<typeof CampaignsPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    beforeEach({ msw }) {
        msw.use(
            http.get(DETAIL_URL, () => HttpResponse.json(campaignDetailFixture)),
            http.get(LIST_URL, () => HttpResponse.json(campaignListFixture)),
        );
    },
    async play({ canvasElement, globals }) {
        const copy = copyFor(globals).AdminPage.campaigns;
        const canvas = within(canvasElement);
        await userEvent.click(await canvas.findByRole('button', { name: copy.presets.instagram }));
        await expect(canvas.getAllByTestId('platform-link')).toHaveLength(4);
    },
};

export const ForMarketing: Story = {
    beforeEach({ msw }) {
        msw.use(
            http.get(DETAIL_URL, () => HttpResponse.json(campaignDetailForMarketingFixture)),
            http.get(LIST_URL, () => HttpResponse.json(campaignListForMarketingFixture)),
        );
    },
};

// All time has no previous period: no changes, no dashed line, no legend.
export const AllTime: Story = {
    beforeEach({ msw }) {
        msw.use(
            http.get(DETAIL_URL, ({ request }) =>
                HttpResponse.json(new URL(request.url).searchParams.has('since') ? campaignDetailFixture : campaignDetailAllTimeFixture),
            ),
            http.get(LIST_URL, () => HttpResponse.json(campaignListFixture)),
        );
    },
    async play({ canvasElement, globals }) {
        const copy = copyFor(globals).AdminPage;
        const canvas = within(canvasElement);
        await userEvent.click(await canvas.findByRole('button', { name: copy.funnel.range.ALL }));
        await expect(canvas.queryByText(copy.campaigns.chart.previous)).not.toBeInTheDocument();
    },
};

export const Loading: Story = {
    tags: ['visual-skip'],
    beforeEach({ msw }) {
        msw.use(
            http.get(DETAIL_URL, () => delay('infinite')),
            http.get(LIST_URL, () => delay('infinite')),
        );
    },
};
