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
    args: { canEditDiscount: true },
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
    args: { canEditDiscount: false },
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

export const Edit: Story = {
    beforeEach({ msw }) {
        msw.use(
            http.get(DETAIL_URL, () => HttpResponse.json(campaignDetailFixture)),
            http.get(LIST_URL, () => HttpResponse.json(campaignListFixture)),
        );
    },
    async play({ canvasElement, globals }) {
        const copy = copyFor(globals).AdminPage.campaigns;
        const page = within(canvasElement.ownerDocument.body);
        await userEvent.click(await page.findByRole('button', { name: copy.edit }));
        await expect(await page.findByRole('button', { name: copy.stopDiscount.button })).toBeInTheDocument();
    },
};

// Marketing sees the discount, locked, and no Stop discount.
export const EditForMarketing: Story = {
    args: { canEditDiscount: false },
    beforeEach({ msw }) {
        msw.use(
            http.get(DETAIL_URL, () => HttpResponse.json(campaignDetailForMarketingFixture)),
            http.get(LIST_URL, () => HttpResponse.json(campaignListForMarketingFixture)),
        );
    },
    async play({ canvasElement, globals }) {
        const copy = copyFor(globals).AdminPage.campaigns;
        const page = within(canvasElement.ownerDocument.body);
        await userEvent.click(await page.findByRole('button', { name: copy.edit }));
        await expect(await page.findByRole('switch', { name: copy.form.discount })).toBeDisabled();
    },
};

export const Links: Story = {
    beforeEach({ msw }) {
        msw.use(
            http.get(DETAIL_URL, () => HttpResponse.json(campaignDetailFixture)),
            http.get(LIST_URL, () => HttpResponse.json(campaignListFixture)),
        );
    },
    async play({ canvasElement, globals }) {
        const copy = copyFor(globals).AdminPage.campaigns;
        const page = within(canvasElement.ownerDocument.body);
        await userEvent.click(await page.findByRole('button', { name: copy.linksButton.replace('{count}', '8') }));
        await expect(
            await page.findByRole('button', { name: `${copy.presets.facebook} ${copy.linkTypes.post} ${copy.languages.el}` }),
        ).toBeInTheDocument();
    },
};

// One link opened: its address, QR code, Move and Delete.
export const OneLink: Story = {
    beforeEach({ msw }) {
        msw.use(
            http.get(DETAIL_URL, () => HttpResponse.json(campaignDetailFixture)),
            http.get(LIST_URL, () => HttpResponse.json(campaignListFixture)),
        );
    },
    async play({ canvasElement, globals }) {
        const copy = copyFor(globals).AdminPage.campaigns;
        const page = within(canvasElement.ownerDocument.body);
        await userEvent.click(await page.findByRole('button', { name: copy.linksButton.replace('{count}', '8') }));
        await userEvent.click(await page.findByRole('button', { name: `${copy.presets.facebook} ${copy.linkTypes.post} ${copy.languages.el}` }));
        await expect(await page.findByRole('button', { name: copy.linksDrawer.move })).toBeInTheDocument();
    },
};
