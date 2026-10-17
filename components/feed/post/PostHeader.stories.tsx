import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { withAppContext } from '@/.storybook/appContext';
import { guestAuthor, storyPost } from '@/.storybook/fixtures';
import { PostHeader } from '@/components/feed/post/PostHeader';

// The post's header in the comments view.
const meta = {
    title: 'Feed/Post/PostHeader',
    component: PostHeader,
    args: { post: storyPost({ author: { ...guestAuthor, nickname: 'Best man' } }), timeAgo: { unit: 'hours', value: 2 } },
    decorators: [withAppContext],
} satisfies Meta<typeof PostHeader>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Author: Story = {};

export const PlaylistDigest: Story = {
    args: { post: storyPost({ type: 'PLAYLIST', author: null, media: [] }) },
};

export const UnknownAuthor: Story = {
    args: { post: storyPost({ author: null }) },
};
