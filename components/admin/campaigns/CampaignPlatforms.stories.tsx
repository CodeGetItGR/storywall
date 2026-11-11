import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, userEvent, within } from 'storybook/test';

import { withAdminShell } from '@/.storybook/admin';
import { copyFor } from '@/.storybook/copy';
import { campaignDetailFixture } from '@/components/admin/campaigns/__fixtures__/campaigns';
import { CampaignPlatforms } from '@/components/admin/campaigns/CampaignPlatforms';
import { campaignPlatformRows } from '@/lib/campaignCompare';

const meta = {
    title: 'Admin/Campaigns/Platforms',
    component: CampaignPlatforms,
    args: { rows: campaignPlatformRows(campaignDetailFixture.links, 'sales'), measure: 'sales' },
    decorators: [withAdminShell],
} satisfies Meta<typeof CampaignPlatforms>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

// Instagram opened to its four links.
export const Open: Story = {
    async play({ canvasElement, globals }) {
        const copy = copyFor(globals).AdminPage.campaigns;
        const canvas = within(canvasElement);
        await userEvent.click(canvas.getByRole('button', { name: copy.presets.instagram }));
        await expect(canvas.getAllByTestId('platform-link')).toHaveLength(4);
    },
};

// A campaign with no sales yet is measured by sign-ups.
export const BySignUps: Story = { args: { rows: campaignPlatformRows(campaignDetailFixture.links, 'signedUp'), measure: 'signedUp' } };
