import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { ReactionCount } from '@/components/feed/post/ReactionCount';

const meta = {
    title: 'Feed/Post/ReactionCount',
    component: ReactionCount,
    args: { count: 12, iconStrokeWidth: 1.8 },
} satisfies Meta<typeof ReactionCount>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Zero: Story = {
    args: { count: 0 },
};
