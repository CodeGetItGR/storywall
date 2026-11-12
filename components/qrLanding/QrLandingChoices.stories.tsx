import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';

import { QrLandingChoices } from '@/components/qrLanding/QrLandingChoices';

const meta = {
    title: 'QrLanding/QrLandingChoices',
    component: QrLandingChoices,
    args: {
        eventId: 'evt-story',
        onChoose: fn(),
        plan: { choices: ['join', 'upload'], joinInviteToken: 'inv-story', uploadToken: 'up-story', wishToken: null },
    },
    decorators: [
        (Story) => (
            <div className="max-w-md bg-background p-4">
                <Story />
            </div>
        ),
    ],
} satisfies Meta<typeof QrLandingChoices>;

export default meta;
type Story = StoryObj<typeof meta>;

// A guest scans the event's code.
export const Guest: Story = {};

// A signed-in member of an event with a wishbook.
export const Member: Story = {
    args: {
        plan: { choices: ['open', 'upload', 'wishbook'], joinInviteToken: 'inv-story', uploadToken: 'up-story', wishToken: null },
    },
};

// A lite event's guest code.
export const LiteGuestCode: Story = {
    args: {
        plan: { choices: ['upload', 'wish'], joinInviteToken: null, uploadToken: 'self', wishToken: 'self' },
    },
};
