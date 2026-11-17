import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, fn, userEvent, within } from 'storybook/test';

import { copyFor } from '@/.storybook/copy';
import { waitForOpen } from '@/.storybook/waitForOpen';
import { campaignDetailFixture, campaignListFixture } from '@/components/admin/campaigns/__fixtures__/campaigns';
import { CampaignLinksDrawer } from '@/components/admin/campaigns/CampaignLinksDrawer';

const LINKS = campaignDetailFixture.links.map((stats) => stats.link);
const OTHERS = campaignListFixture.items.map((item) => item.campaign).filter((campaign) => campaign.id !== 'launch');

const meta = {
    title: 'Admin/Campaigns/LinksDrawer',
    component: CampaignLinksDrawer,
    args: { open: true, campaign: campaignDetailFixture.campaign, links: LINKS, others: OTHERS, onCloseAction: fn() },
    async play() {
        await expect(await waitForOpen('dialog')).toBeVisible();
    },
} satisfies Meta<typeof CampaignLinksDrawer>;

export default meta;
type Story = StoryObj<typeof meta>;

// The campaign's links by platform, each with its copy button.
export const List: Story = {};

export const Empty: Story = { args: { links: [], campaign: { ...campaignDetailFixture.campaign, linkCount: 0 } } };

// An archived campaign: its links stay, but Add links is off.
export const Archived: Story = {
    args: { campaign: { ...campaignDetailFixture.campaign, status: 'ARCHIVED', archivedAt: '2026-07-01T09:00:00Z' } },
    async play({ globals }) {
        const copy = copyFor(globals).AdminPage.campaigns;
        const drawer = await waitForOpen('dialog');
        await expect(within(drawer).getByRole('button', { name: copy.linksDrawer.add })).toBeDisabled();
    },
};

// Add links: what the campaign has shows ticked and faded.
export const Add: Story = {
    async play({ globals }) {
        const copy = copyFor(globals).AdminPage.campaigns;
        const drawer = await waitForOpen('dialog');
        await userEvent.click(within(drawer).getByRole('button', { name: copy.linksDrawer.add }));
        await expect(
            await within(drawer).findByRole('checkbox', { name: `${copy.presets.instagram} ${copy.linkTypes.post} · ${copy.picker.added}` }),
        ).toBeDisabled();
    },
};

// One link opened: its address, QR code, Move and Delete.
export const OneLink: Story = {
    async play({ globals }) {
        const copy = copyFor(globals).AdminPage.campaigns;
        const drawer = await waitForOpen('dialog');
        await userEvent.click(within(drawer).getByRole('button', { name: `${copy.presets.facebook} ${copy.linkTypes.post} ${copy.languages.el}` }));
        await expect(await within(drawer).findByRole('button', { name: copy.linksDrawer.move })).toBeInTheDocument();
    },
};
