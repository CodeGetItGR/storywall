import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, userEvent, within } from 'storybook/test';

import { withAdminShell } from '@/.storybook/admin';
import { CampaignChange } from '@/components/admin/campaigns/CampaignChange';

const meta = {
    title: 'Admin/Campaigns/Change',
    component: CampaignChange,
    args: { compared: '17 Apr – 16 May', change: { kind: 'percent', direction: 'up', ratio: 0.39 } },
    decorators: [withAdminShell],
    tags: ['visual-desktop-only'],
} satisfies Meta<typeof CampaignChange>;

export default meta;
type Story = StoryObj<typeof meta>;

export const UpPercent: Story = {};
// Reached by keyboard: the words show under the arrow.
export const Focused: Story = {
    async play({ canvasElement }) {
        await userEvent.tab();
        await expect(await within(canvasElement.ownerDocument.body).findByText(/17 Apr – 16 May/)).toBeInTheDocument();
    },
};
export const DownPercent: Story = { args: { change: { kind: 'percent', direction: 'down', ratio: 0.13 } } };
export const UpCount: Story = { args: { change: { kind: 'count', direction: 'up', amount: 2 } } };
export const Same: Story = { args: { change: { kind: 'same' } } };
export const Money: Story = { args: { change: { kind: 'count', direction: 'up', amount: 4900 }, currency: 'EUR' } };
