import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { withAdminShell } from '@/.storybook/admin';
import { CampaignDiscountBadge } from '@/components/admin/campaigns/CampaignDiscountBadge';
import type { CampaignDiscountViewDto } from '@/lib/api/types';

const LAUNCH: CampaignDiscountViewDto = {
    id: 'discount-1',
    percent: 50,
    label: 'Launch offer',
    startsAt: '2026-06-01T07:00:00Z',
    endsAt: '2026-06-30T20:59:00Z',
    status: 'LIVE',
};

const meta = {
    title: 'Admin/Campaigns/DiscountBadge',
    component: CampaignDiscountBadge,
    args: { discount: LAUNCH },
    decorators: [withAdminShell],
    tags: ['visual-desktop-only'],
} satisfies Meta<typeof CampaignDiscountBadge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Live: Story = {};
export const Scheduled: Story = {
    args: { discount: { ...LAUNCH, startsAt: '2026-07-01T07:00:00Z', endsAt: '2026-07-31T20:59:00Z', status: 'SCHEDULED' } },
};
export const Ended: Story = {
    args: { discount: { ...LAUNCH, percent: 20, label: null, startsAt: '2026-04-01T07:00:00Z', endsAt: '2026-04-30T20:59:00Z', status: 'ENDED' } },
};

// In a campaign's header: what it covers and its dates.
export const WithDates: Story = { args: { withDates: true } };
