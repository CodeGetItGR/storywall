import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';

import { withAppContext } from '@/.storybook/appContext';
import { guestAuthor, storyStory } from '@/.storybook/fixtures';
import { StoryAvatar } from '@/components/feed/StoryAvatar';
import type { StoryGroup } from '@/lib/stories';

const unseen: StoryGroup = {
    authorMemberId: guestAuthor.memberId,
    stories: [storyStory('story-1', guestAuthor)],
    allSeen: false,
    latestCreatedAt: '2026-06-15T09:00:00Z',
};

const meta = {
    title: 'Feed/StoryAvatar',
    component: StoryAvatar,
    args: { group: unseen, author: guestAuthor, onOpenStoryAction: fn() },
    decorators: [withAppContext],
} satisfies Meta<typeof StoryAvatar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Unseen: Story = {};

export const Seen: Story = {
    args: { group: { ...unseen, allSeen: true } },
};

export const WithPhoto: Story = {
    args: { author: { ...guestAuthor, avatarUrl: '/images/post-tux.png' } },
};

export const YourStory: Story = {
    args: { isCurrentUser: true },
};

// Without the stories module open for posting, there is no add button.
export const YourStoryCannotAdd: Story = {
    args: { isCurrentUser: true },
    parameters: { app: { composer: { canComposeStory: false } } },
};
