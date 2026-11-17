import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { withAppContext } from '@/.storybook/appContext';
import { FeedPageSkeleton } from '@/components/feed/FeedPageSkeleton';

// Also shows PostSkeleton and StorySkeleton in place.
const meta = {
    title: 'Feed/FeedPageSkeleton',
    component: FeedPageSkeleton,
    parameters: { layout: 'fullscreen' },
    decorators: [withAppContext],
} satisfies Meta<typeof FeedPageSkeleton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
