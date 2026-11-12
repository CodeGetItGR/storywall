import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';

import { withAdminShell } from '@/.storybook/admin';
import { CampaignTabs } from '@/components/admin/campaigns/CampaignTabs';

const meta = {
    title: 'Admin/Campaigns/Tabs',
    component: CampaignTabs,
    args: { tab: 'current', onChangeAction: fn() },
    decorators: [withAdminShell],
} satisfies Meta<typeof CampaignTabs>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Current: Story = {};
export const Past: Story = { args: { tab: 'past' } };
