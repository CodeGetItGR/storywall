import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { withAdminShell } from '@/.storybook/admin';
import { CampaignLinkTypeIcon } from '@/components/admin/campaigns/CampaignLinkTypeIcon';
import type { CampaignLinkType } from '@/lib/campaignLinks';

const TYPES: readonly CampaignLinkType[] = ['post', 'story', 'postAd', 'storyAd', 'searchAd'];

const meta = {
    title: 'Admin/Campaigns/LinkTypeIcon',
    component: CampaignLinkTypeIcon,
    args: { type: 'post' },
    decorators: [withAdminShell],
    tags: ['visual-desktop-only'],
} satisfies Meta<typeof CampaignLinkTypeIcon>;

export default meta;
type Story = StoryObj<typeof meta>;

// Every type: square post, tall story, a megaphone beside an ad, a magnifier for a search ad.
export const Every: Story = {
    render: () => (
        <div className="flex flex-wrap items-center gap-3">
            {TYPES.map((type) => (
                <CampaignLinkTypeIcon key={type} type={type} />
            ))}
        </div>
    ),
};
