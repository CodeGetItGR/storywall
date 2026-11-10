import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { delay, http, HttpResponse } from 'msw';
import { expect, within } from 'storybook/test';

import { withAdminShell } from '@/.storybook/admin';
import { copyFor } from '@/.storybook/copy';
import { campaignListFixture, campaignListForMarketingFixture, emptyCampaignListFixture } from '@/components/admin/campaigns/__fixtures__/campaigns';
import { CampaignsPanel } from '@/components/admin/campaigns/CampaignsPanel';

const LIST_URL = '*/api/admin/campaigns';

const meta = {
    title: 'Admin/Campaigns/List',
    component: CampaignsPanel,
    decorators: [withAdminShell],
    beforeEach() {
        window.history.replaceState(null, '', '/admin#campaigns');
    },
} satisfies Meta<typeof CampaignsPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Current: Story = {
    beforeEach({ msw }) {
        msw.use(http.get(LIST_URL, () => HttpResponse.json(campaignListFixture)));
    },
    async play({ canvasElement, globals }) {
        const copy = copyFor(globals).AdminPage.campaigns;
        await expect(await within(canvasElement).findByText(copy.columns.verdict)).toBeInTheDocument();
    },
};

export const Past: Story = {
    beforeEach({ msw }) {
        window.history.replaceState(null, '', '/admin#campaigns/past');
        msw.use(http.get(LIST_URL, () => HttpResponse.json(campaignListFixture)));
    },
};

export const ForMarketing: Story = {
    beforeEach({ msw }) {
        msw.use(http.get(LIST_URL, () => HttpResponse.json(campaignListForMarketingFixture)));
    },
};

export const Empty: Story = {
    beforeEach({ msw }) {
        msw.use(http.get(LIST_URL, () => HttpResponse.json(emptyCampaignListFixture)));
    },
};

export const Loading: Story = {
    tags: ['visual-skip'],
    beforeEach({ msw }) {
        msw.use(http.get(LIST_URL, () => delay('infinite')));
    },
};
