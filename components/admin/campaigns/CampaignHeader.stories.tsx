import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';

import { withAdminShell } from '@/.storybook/admin';
import { campaignDetailFixture, campaignFixture } from '@/components/admin/campaigns/__fixtures__/campaigns';
import { CampaignHeader } from '@/components/admin/campaigns/CampaignHeader';

const meta = {
    title: 'Admin/Campaigns/Header',
    component: CampaignHeader,
    args: { campaign: campaignDetailFixture.campaign, updatedAt: '12:00', isFetching: false, onRefreshAction: fn() },
    decorators: [withAdminShell],
} satisfies Meta<typeof CampaignHeader>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithDiscount: Story = {};
export const NoDiscount: Story = { args: { campaign: campaignFixture({ name: 'Autumn posts', discount: null, startsAt: null, endsAt: null }) } };
export const Archived: Story = {
    args: {
        campaign: campaignFixture({
            name: 'October bio link',
            status: 'ARCHIVED',
            discount: null,
            startsAt: null,
            endsAt: null,
            archivedAt: '2026-05-02T10:00:00Z',
        }),
    },
};
export const Refreshing: Story = { tags: ['visual-skip'], args: { isFetching: true } };
