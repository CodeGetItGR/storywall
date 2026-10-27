import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { FeedEmptyState } from '@/components/feed/FeedEmptyState';

const meta = {
    title: 'Feed/FeedEmptyState',
    component: FeedEmptyState,
} satisfies Meta<typeof FeedEmptyState>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
