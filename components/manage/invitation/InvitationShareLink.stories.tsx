import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, within } from 'storybook/test';

import { copyFor } from '@/.storybook/copy';
import { InvitationShareLink } from '@/components/manage/invitation/InvitationShareLink';

const meta = {
    title: 'Manage/Invitation/InvitationShareLink',
    component: InvitationShareLink,
    decorators: [
        (Story) => (
            <div className="max-w-3xl bg-event p-5">
                <Story />
            </div>
        ),
    ],
    args: { url: 'https://invite.storywall.gr/maria-nikos' },
} satisfies Meta<typeof InvitationShareLink>;

export default meta;
type Story = StoryObj<typeof meta>;

// The published link with copy and its QR code.
export const Default: Story = {
    play: async ({ canvasElement, globals }) => {
        const copy = copyFor(globals).ManagePage;
        const canvas = within(canvasElement);
        await expect(canvas.getByText('https://invite.storywall.gr/maria-nikos')).toBeVisible();
        await expect(canvas.getByRole('img', { name: copy.invitation.qrAlt })).toBeVisible();
        await expect(canvas.getByRole('button', { name: copy.invitations.copyLink })).toBeVisible();
    },
};
