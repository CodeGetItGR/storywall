import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { withAdminShell } from '@/.storybook/admin';
import { CampaignVerdict } from '@/components/admin/campaigns/CampaignVerdict';

const meta = {
    title: 'Admin/Campaigns/Verdict',
    component: CampaignVerdict,
    args: { verdict: { kind: 'better', measure: 'sales', multiple: 3 } },
    decorators: [withAdminShell],
    tags: ['visual-desktop-only'],
} satisfies Meta<typeof CampaignVerdict>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Better: Story = {};
export const BetterFromZero: Story = { args: { verdict: { kind: 'better', measure: 'signedUp', multiple: null } } };
export const Worse: Story = { args: { verdict: { kind: 'worse', measure: 'sales' } } };
export const NoSignUps: Story = { args: { verdict: { kind: 'noSignUps' } } };
export const Average: Story = { args: { verdict: { kind: 'average', measure: 'sales' } } };
export const TooEarly: Story = { args: { verdict: { kind: 'early' } } };
export const NothingToCompare: Story = { args: { verdict: null } };
