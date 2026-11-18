import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { CommentCount } from '@/components/feed/post/CommentCount';

const meta = {
    title: 'Feed/Post/CommentCount',
    component: CommentCount,
    args: { count: 5 },
} satisfies Meta<typeof CommentCount>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Zero: Story = {
    args: { count: 0 },
};
