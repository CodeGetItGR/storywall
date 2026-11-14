import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { QrJoinCard } from '@/components/qrLanding/QrJoinCard';

const meta = {
    title: 'QrLanding/QrJoinCard',
    component: QrJoinCard,
    args: {
        choice: 'join',
        href: '/invite/inv-story',
        coverSrc: '/landing/couple-cheering-with-guests-under-lit-arch-at-night.webp',
        title: 'Maria & Nikos',
        showAccountNote: true,
    },
    decorators: [
        (Story) => (
            <div className="max-w-sm bg-background p-6">
                <Story />
            </div>
        ),
    ],
} satisfies Meta<typeof QrJoinCard>;

export default meta;
type Story = StoryObj<typeof meta>;

// A guest without an account.
export const Join: Story = {};

// Someone signed in who hasn't joined yet: no account note.
export const JoinSignedIn: Story = {
    args: { showAccountNote: false },
};

// A member opening the event.
export const Open: Story = {
    args: { choice: 'open', showAccountNote: false },
};

// An event without a cover.
export const WithoutCover: Story = {
    args: { coverSrc: null },
};
