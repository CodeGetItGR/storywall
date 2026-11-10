import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { withAdminShell } from '@/.storybook/admin';
import { campaignListFixture, campaignListForMarketingFixture } from '@/components/admin/campaigns/__fixtures__/campaigns';
import { CampaignSummary } from '@/components/admin/campaigns/CampaignSummary';

const meta = {
    title: 'Admin/Campaigns/Summary',
    component: CampaignSummary,
    args: { current: campaignListFixture.current, previous: campaignListFixture.previous, compared: '17 Apr – 16 May' },
    decorators: [withAdminShell],
} satisfies Meta<typeof CampaignSummary>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const ForMarketing: Story = { args: { current: campaignListForMarketingFixture.current, previous: campaignListForMarketingFixture.previous } };
// All time: nothing to compare with, so no changes.
export const AllTime: Story = { args: { previous: null, compared: null } };
