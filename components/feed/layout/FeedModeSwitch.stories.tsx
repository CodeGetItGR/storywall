import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { useState } from 'react';
import { expect, fn, userEvent, within } from 'storybook/test';

import { copyFor } from '@/.storybook/copy';
import { FeedModeSwitch } from '@/components/feed/layout/FeedModeSwitch';
import type { FeedMode } from '@/lib/feedMode';

function SwitchStory({ start, canEdit = false }: { start: FeedMode; canEdit?: boolean }) {
    const [mode, setMode] = useState(start);
    return (
        <div className="flex justify-center bg-event p-6">
            <FeedModeSwitch mode={mode} onSelect={setMode} onEdit={canEdit ? fn() : undefined} />
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

export const SocialFeed: Story = { args: { start: 'feed' } };

// Hosts and co-hosts: the Edit pencil between the halves.
export const HostInvitation: Story = { args: { canEdit: true } };

export const HostSocialFeed: Story = { args: { start: 'feed', canEdit: true } };

// The narrowest phone: neither half wraps.
export const HostNarrow: Story = {
    args: { canEdit: true },
    decorators: [
        (Story) => (
            <div className="w-80">
                <Story />
            </div>
        ),
    ],
};

// The thumb slides to the tapped half.
export const Switching: Story = {
    play: async ({ canvasElement, globals }) => {
        const canvas = within(canvasElement);
        const feed = canvas.getByRole('button', { name: copyFor(globals).FeedLayout.socialFeed });
        await userEvent.click(feed);
        await expect(feed).toHaveAttribute('aria-pressed', 'true');
    },
};
