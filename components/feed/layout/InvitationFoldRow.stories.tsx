import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, fn, userEvent, within } from 'storybook/test';

import { InvitationFoldRow } from '@/components/feed/layout/InvitationFoldRow';

const meta = {
    title: 'Feed/Layout/InvitationFoldRow',
    component: InvitationFoldRow,
    args: { open: false, onToggle: fn(), controls: 'feed-invitation' },
} satisfies Meta<typeof InvitationFoldRow>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Closed: Story = {
    play: async ({ args, canvasElement }) => {
        const row = within(canvasElement).getByRole('button', { expanded: false });
        await userEvent.click(row);
        await expect(args.onToggle).toHaveBeenCalledOnce();
    },
};

export const Open: Story = { args: { open: true } };
