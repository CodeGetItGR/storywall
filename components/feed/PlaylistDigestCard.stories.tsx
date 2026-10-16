import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { withAppContext } from '@/.storybook/appContext';
import { guestAuthor, storyComment, storyPost } from '@/.storybook/fixtures';
import { PlaylistDigestCard } from '@/components/feed/PlaylistDigestCard';

// The backend writes the digest in English; the card turns it into the viewer's language.
const digest = storyPost({ id: 'post-digest', type: 'PLAYLIST', author: null, media: [], content: '🎵 5 new songs were added to the playlist!' });

const meta = {
    title: 'Feed/PlaylistDigestCard',
    component: PlaylistDigestCard,
    args: { post: digest },
    decorators: [
        withAppContext,
        (Story) => (
            <div className="mx-auto max-w-2xl">
                <Story />
            </div>
        ),
    ],
} satisfies Meta<typeof PlaylistDigestCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const SeveralSongs: Story = {};

export const OneSong: Story = {
    args: { post: { ...digest, content: '🎵 "Dancing Queen by ABBA" was just added to the playlist!' } },
};

export const Pinned: Story = {
    args: { post: { ...digest, isPinned: true } },
};

export const WithComments: Story = {
    args: {
        post: {
            ...digest,
            commentCount: 2,
            recentComments: [
                storyComment('c1', { postId: digest.id, content: 'Adding a few more for the dance floor!' }),
                storyComment('c2', { postId: digest.id, author: { ...guestAuthor, displayName: 'Sofia Ioannou' }, content: 'Yes!!' }),
            ],
        },
    },
};
