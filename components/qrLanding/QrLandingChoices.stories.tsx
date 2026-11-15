import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';

import { QrLandingChoices } from '@/components/qrLanding/QrLandingChoices';

const meta = {
    title: 'QrLanding/QrLandingChoices',
    component: QrLandingChoices,
    args: {
        eventId: 'evt-story',
        onChoose: fn(),
        plan: { choices: ['join', 'upload', 'wish'], joinInviteToken: 'inv-story', uploadToken: 'up-story', wishToken: 'wish-story' },
        coverSrc: '/landing/couple-cheering-with-guests-under-lit-arch-at-night.webp',
        eventTitle: 'Maria & Nikos',
        isSignedIn: false,
    },
    decorators: [
        (Story) => (
            <div className="max-w-sm bg-background p-6">
                <Story />
            </div>
        ),
    ],
} satisfies Meta<typeof QrLandingChoices>;

export default meta;
type Story = StoryObj<typeof meta>;

// A guest scans the event's code.
export const Guest: Story = {};

// An event without a cover: the preview's banner falls back to the brand gradient.
export const GuestWithoutCover: Story = {
    args: { coverSrc: null },
};

// Someone signed in who hasn't joined this event yet.
export const SignedInGuest: Story = {
    args: { isSignedIn: true },
};

// A signed-in member of an event with a wishbook.
export const Member: Story = {
    args: {
        isSignedIn: true,
        plan: { choices: ['open', 'upload', 'wishbook'], joinInviteToken: 'inv-story', uploadToken: 'up-story', wishToken: null },
    },
};

// A lite event's guest code.
export const LiteGuestCode: Story = {
    args: {
        eventId: null,
        plan: { choices: ['upload', 'wish'], joinInviteToken: null, uploadToken: 'self', wishToken: 'self' },
    },
};
