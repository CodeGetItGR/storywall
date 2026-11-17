import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { QrLinksSection } from '@/components/layout/right-context-panel/QrLinksSection';

const meta = {
    title: 'Layout/RightContextPanel/QrLinksSection',
    component: QrLinksSection,
    args: {
        eventId: 'evt-story',
        showInvitations: true,
        invitationsQrCount: 3,
    },
    decorators: [
        (Story) => (
            <div className="max-w-xs">
                <Story />
            </div>
        ),
    ],
} satisfies Meta<typeof QrLinksSection>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const OneLink: Story = {
    args: { invitationsQrCount: 1 },
};

// The share link was revoked.
export const NoActiveLink: Story = {
    args: { invitationsQrCount: 0 },
};
