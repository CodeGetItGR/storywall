import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { StoriesEmptyHint } from '@/components/feed/StoriesEmptyHint';

const meta = {
    title: 'Feed/StoriesEmptyHint',
    component: StoriesEmptyHint,
    args: { storiesName: 'Stories', canCompose: true },
} satisfies Meta<typeof StoriesEmptyHint>;

export default meta;
type Story = StoryObj<typeof meta>;

export const CanShare: Story = {};

export const CannotShare: Story = {
    args: { canCompose: false },
};
