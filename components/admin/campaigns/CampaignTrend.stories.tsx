import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { withAdminShell } from '@/.storybook/admin';
import { dailyFixture } from '@/components/admin/campaigns/__fixtures__/campaigns';
import { CampaignTrend } from '@/components/admin/campaigns/CampaignTrend';

const meta = {
    title: 'Admin/Campaigns/Trend',
    component: CampaignTrend,
    args: { daily: dailyFixture(true, 6), trend: 'up' },
    decorators: [withAdminShell],
    tags: ['visual-desktop-only'],
} satisfies Meta<typeof CampaignTrend>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Rising: Story = {};
export const Falling: Story = { args: { daily: dailyFixture(false, 3), trend: 'down' } };
export const Steady: Story = { args: { daily: dailyFixture(false, 0), trend: 'flat' } };
// The Past tab draws every line gray.
export const Past: Story = { args: { daily: dailyFixture(false, 1), trend: 'down', muted: true } };
