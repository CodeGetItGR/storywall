import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { withAdminShell } from '@/.storybook/admin';
import { campaignDetailFixture } from '@/components/admin/campaigns/__fixtures__/campaigns';
import { CampaignDailyChart } from '@/components/admin/campaigns/CampaignDailyChart';
import { campaignDailyRows } from '@/lib/campaignCompare';

const meta = {
    title: 'Admin/Campaigns/DailyChart',
    component: CampaignDailyChart,
    args: { rows: campaignDailyRows(campaignDetailFixture.daily, campaignDetailFixture.previousDaily), hasPrevious: true },
    decorators: [withAdminShell],
} satisfies Meta<typeof CampaignDailyChart>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithPrevious: Story = {};
// All time: one line, no legend.
export const AllTime: Story = { args: { rows: campaignDailyRows(campaignDetailFixture.daily, []), hasPrevious: false } };
// One day in the range: a dot instead of a line.
export const OneDay: Story = { args: { rows: campaignDailyRows(campaignDetailFixture.daily.slice(-1), []), hasPrevious: false } };
