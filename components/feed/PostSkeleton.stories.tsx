import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { PostSkeleton } from '@/components/feed/PostSkeleton';

const meta = {
    title: 'Feed/PostSkeleton',
    component: PostSkeleton,
    decorators: [
        (Story) => (
            <div className="mx-auto max-w-2xl">
                <Story />
            </div>
        ),
    ],
} satisfies Meta<typeof PostSkeleton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const TextOnly: Story = {};

export const WithMedia: Story = {
    args: { withMedia: true },
};
