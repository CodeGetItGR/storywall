import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, fn, userEvent, within } from 'storybook/test';

import { copyFor } from '@/.storybook/copy';
import { waitForOpen } from '@/.storybook/waitForOpen';
import { campaignFixture } from '@/components/admin/campaigns/__fixtures__/campaigns';
import { CampaignFormDrawer } from '@/components/admin/campaigns/CampaignFormDrawer';

const ENDED = campaignFixture({ id: 'spring', name: 'Spring posts', linkName: 'spring', status: 'ENDED', discount: null, linkCount: 3 });

// The drawer portals itself to the body, with the console's palette on it.
const meta = {
    title: 'Admin/Campaigns/FormDrawer',
    component: CampaignFormDrawer,
    args: {
        open: true,
        campaign: null,
        links: [],
        deletable: false,
        canEditDiscount: true,
        onCloseAction: fn(),
        onCreatedAction: fn(),
        onDeletedAction: fn(),
    },
    async play() {
        await expect(await waitForOpen('dialog')).toBeVisible();
    },
} satisfies Meta<typeof CampaignFormDrawer>;

export default meta;
type Story = StoryObj<typeof meta>;

// New campaign: name, link name, discount and the link picker.
export const New: Story = {};

// A running campaign with a discount: no picker, and Stop discount.
export const Edit: Story = { args: { campaign: campaignFixture() } };

// Marketing sees the discount locked, and no Stop discount.
export const EditForMarketing: Story = { args: { campaign: campaignFixture(), canEditDiscount: false } };

// An ended campaign: Archive.
export const Ended: Story = { args: { campaign: ENDED } };

// No visit and no discount: Delete campaign.
export const Deletable: Story = { args: { campaign: campaignFixture({ discount: null, linkCount: 0 }), deletable: true } };

export const ConfirmStop: Story = {
    args: { campaign: campaignFixture() },
    async play({ globals }) {
        const copy = copyFor(globals).AdminPage.campaigns;
        const drawer = await waitForOpen('dialog');
        await userEvent.click(within(drawer).getByRole('button', { name: copy.stopDiscount.button }));
        // The confirmation's dialog has no name of its own; its title is the only place this text shows.
        await expect(await within(document.body).findByText(copy.stopDiscount.title)).toBeVisible();
    },
};

export const ConfirmArchive: Story = {
    args: { campaign: ENDED },
    async play({ globals }) {
        const copy = copyFor(globals).AdminPage.campaigns;
        const drawer = await waitForOpen('dialog');
        await userEvent.click(within(drawer).getByRole('button', { name: copy.archive.button }));
        // The confirmation's dialog has no name of its own; its title is the only place this text shows.
        await expect(await within(document.body).findByText(copy.archive.title)).toBeVisible();
    },
};

export const ConfirmDelete: Story = {
    args: { campaign: campaignFixture({ discount: null, linkCount: 0 }), deletable: true },
    async play({ globals }) {
        const copy = copyFor(globals).AdminPage.campaigns;
        const drawer = await waitForOpen('dialog');
        await userEvent.click(within(drawer).getByRole('button', { name: copy.deleteCampaign.button }));
        // The confirmation's dialog has no name of its own; its title is the only place this text shows.
        await expect(await within(document.body).findByText(copy.deleteCampaign.title)).toBeVisible();
    },
};
