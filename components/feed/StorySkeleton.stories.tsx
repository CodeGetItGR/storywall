import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { StorySkeleton } from '@/components/feed/StorySkeleton';

const meta = {
    title: 'Feed/StorySkeleton',
    component: StorySkeleton,
} satisfies Meta<typeof StorySkeleton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
