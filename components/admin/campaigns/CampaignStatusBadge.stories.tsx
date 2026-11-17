import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { withAdminShell } from '@/.storybook/admin';
import { CampaignStatusBadge } from '@/components/admin/campaigns/CampaignStatusBadge';

const meta = {
    title: 'Admin/Campaigns/StatusBadge',
    component: CampaignStatusBadge,
    args: { status: 'LIVE' },
    decorators: [withAdminShell],
    tags: ['visual-desktop-only'],
} satisfies Meta<typeof CampaignStatusBadge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Live: Story = {};
export const Scheduled: Story = { args: { status: 'SCHEDULED' } };
export const Ended: Story = { args: { status: 'ENDED' } };
export const Archived: Story = { args: { status: 'ARCHIVED' } };
