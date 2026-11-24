import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';

import { FeedBlockButtons } from '@/components/feed/edit/FeedBlockButtons';

const meta = {
    title: 'Feed/Edit/FeedBlockButtons',
    component: FeedBlockButtons,
    args: { color: '#2f2b2d', uploading: false, onPhoto: fn(), onColor: fn() },
    decorators: [
        (Story) => (
            // The bottom-left corner of a Save my date block.
            <div className="relative h-40 w-80 bg-[#f3eee8]">
                <Story />
            </div>
        ),
    ],
} satisfies Meta<typeof FeedBlockButtons>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Idle: Story = {};

export const Uploading: Story = { args: { uploading: true } };
