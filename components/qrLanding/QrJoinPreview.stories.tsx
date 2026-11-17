import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { QrJoinPreview } from '@/components/qrLanding/QrJoinPreview';

const meta = {
    title: 'QrLanding/QrJoinPreview',
    component: QrJoinPreview,
    args: {
        coverSrc: '/landing/couple-cheering-with-guests-under-lit-arch-at-night.webp',
        title: 'Maria & Nikos',
    },
    decorators: [
        (Story) => (
            <div className="max-w-sm bg-surface-muted p-6">
                <Story />
            </div>
        ),
    ],
} satisfies Meta<typeof QrJoinPreview>;

export default meta;
type Story = StoryObj<typeof meta>;

// The phone with the event's own cover.
export const WithCover: Story = {};

// No cover: the banner falls back to the brand gradient.
export const WithoutCover: Story = {
    args: { coverSrc: null },
};
