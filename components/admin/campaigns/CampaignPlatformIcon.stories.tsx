import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, userEvent, within } from 'storybook/test';

import { withAdminShell } from '@/.storybook/admin';
import { copyFor } from '@/.storybook/copy';
import { CampaignPlatformIcon } from '@/components/admin/campaigns/CampaignPlatformIcon';
import { CAMPAIGN_PLATFORMS } from '@/lib/campaignLinks';

const meta = {
    title: 'Admin/Campaigns/PlatformIcon',
    component: CampaignPlatformIcon,
    args: { platform: 'instagram', className: 'h-5 w-5' },
    decorators: [withAdminShell],
    tags: ['visual-desktop-only'],
} satisfies Meta<typeof CampaignPlatformIcon>;

export default meta;
type Story = StoryObj<typeof meta>;

// Every platform, in its color.
export const Every: Story = {
    render: (args) => (
        <div className="flex flex-wrap items-center gap-3">
            {CAMPAIGN_PLATFORMS.map((platform) => (
                <CampaignPlatformIcon key={platform} platform={platform} className={args.className} />
            ))}
        </div>
    ),
};

// Reached by keyboard: the name shows under the icon.
export const Focused: Story = {
    async play({ canvasElement, globals }) {
        await userEvent.tab();
        const name = copyFor(globals).AdminPage.campaigns.presets.instagram;
        await expect(await within(canvasElement.ownerDocument.body).findByText(name)).toBeInTheDocument();
    },
};
