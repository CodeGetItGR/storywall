import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { useState } from 'react';
import { expect, userEvent, within } from 'storybook/test';

import { copyFor } from '@/.storybook/copy';
import { FeedModeSwitch } from '@/components/feed/layout/FeedModeSwitch';
import type { FeedMode } from '@/lib/feedMode';

function SwitchStory({ start }: { start: FeedMode }) {
    const [mode, setMode] = useState(start);
    return (
        <div className="flex justify-center bg-event p-6">
            <FeedModeSwitch mode={mode} onSelect={setMode} />
        </div>
    );
}

const meta = {
    title: 'Feed/Layout/FeedModeSwitch',
    component: SwitchStory,
    args: { start: 'invitation' },
} satisfies Meta<typeof SwitchStory>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Invitation: Story = {};

export const Posts: Story = { args: { start: 'feed' } };

// The thumb slides to the tapped half.
export const Switching: Story = {
    play: async ({ canvasElement, globals }) => {
        const canvas = within(canvasElement);
        const feed = canvas.getByRole('button', { name: copyFor(globals).FeedLayout.posts });
        await userEvent.click(feed);
        await expect(feed).toHaveAttribute('aria-pressed', 'true');
    },
};
