import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { delay, http, HttpResponse } from 'msw';
import { expect, userEvent, within } from 'storybook/test';

import { withAdminShell } from '@/.storybook/admin';
import { copyFor } from '@/.storybook/copy';
import { campaignListFixture, campaignListForMarketingFixture, emptyCampaignListFixture } from '@/components/admin/campaigns/__fixtures__/campaigns';
import { CampaignsPanel } from '@/components/admin/campaigns/CampaignsPanel';

const LIST_URL = '*/api/admin/campaigns';

const meta = {
    title: 'Admin/Campaigns/List',
    component: CampaignsPanel,
    args: { canEditDiscount: true },
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
    args: { canEditDiscount: false },
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

// The drawer as it opens, with a Greek name typed and two placements ticked.
export const NewCampaign: Story = {
    beforeEach({ msw }) {
        msw.use(http.get(LIST_URL, () => HttpResponse.json(campaignListFixture)));
    },
    async play({ canvasElement, globals }) {
        const copy = copyFor(globals).AdminPage.campaigns;
        const page = within(canvasElement.ownerDocument.body);
        await userEvent.click(await page.findByRole('button', { name: copy.newCampaign }));
        await userEvent.type(await page.findByRole('textbox', { name: copy.fields.name }), 'Καλοκαίρι 2026');
        await expect(page.getByRole('textbox', { name: copy.fields.linkName })).toHaveValue('kalokairi-2026');
        await userEvent.click(page.getByRole('checkbox', { name: `${copy.presets.instagram} ${copy.linkTypes.story}` }));
        await userEvent.click(page.getByRole('checkbox', { name: copy.presets.email }));
    },
};
