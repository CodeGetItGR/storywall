import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { userEvent, within } from 'storybook/test';

import { withAppContext } from '@/.storybook/appContext';
import { copyFor } from '@/.storybook/copy';
import { guestAuthor, STORY_GUEST_MEMBER_ID, storyAuthor, storyComment, storyEvent, storyHostMember, storyMedia, storyPhotos, storyPost } from '@/.storybook/fixtures';
import { PostCard } from '@/components/feed/PostCard';

const me = storyAuthor({ memberId: STORY_GUEST_MEMBER_ID, displayName: 'Maria Papadopoulou', role: 'ATTENDEE' });
const myPost = storyPost({ id: 'post-mine', authorMemberId: me.memberId, author: me, content: 'Cake time!', media: [storyPhotos[1]] });

// A guest of the wedding sees a host's post by default.
const meta = {
    title: 'Feed/PostCard',
    component: PostCard,
    args: { post: storyPost() },
    decorators: [
        withAppContext,
        (Story) => (
            <div className="mx-auto max-w-2xl">
                <Story />
            </div>
        ),
    ],
} satisfies Meta<typeof PostCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const SinglePhoto: Story = {};

export const TextOnly: Story = {
    args: { post: storyPost({ type: 'TEXT', media: [], author: guestAuthor, authorMemberId: guestAuthor.memberId }) },
};

export const LongText: Story = {
    args: {
        post: storyPost({
            type: 'TEXT',
            media: [],
            content:
                'What a day. Thank you to everyone who travelled from near and far to be with us, to the band who kept the dance floor full until three, and to our parents for everything. We read every message and looked at every photo twice. Please keep sharing them here so we can relive it all.',
        }),
    },
};

export const TwoPhotos: Story = {
    args: { post: storyPost({ media: storyPhotos.slice(0, 2) }) },
};

export const ThreePhotos: Story = {
    args: { post: storyPost({ media: storyPhotos.slice(0, 3) }) },
};

export const ManyPhotos: Story = {
    args: { post: storyPost({ media: storyPhotos }) },
};

export const VideoProcessing: Story = {
    args: { post: storyPost({ media: [storyMedia('v1', { mediaType: 'VIDEO', mimeType: 'video/mp4', status: 'PROCESSING', mediaUrl: '' })] }) },
};

export const Pinned: Story = {
    args: { post: storyPost({ isPinned: true }) },
};

export const WithReactionsAndComments: Story = {
    args: {
        post: storyPost({
            reactionCount: 12,
            reactionCounts: { LOVE: 8, LAUGH: 3, WOW: 1 },
            myReactionType: 'LOVE',
            commentCount: 5,
            recentComments: [storyComment('c1'), storyComment('c2', { author: { ...guestAuthor, displayName: 'Sofia Ioannou' }, content: 'Gorgeous!' })],
        }),
    },
};

export const UnknownAuthor: Story = {
    args: { post: storyPost({ author: null }) },
};

// The author can edit or delete their own post.
export const MyPostActions: Story = {
    args: { post: myPost },
    play: async ({ canvasElement, globals }) => {
        await userEvent.click(within(canvasElement).getByRole('button', { name: copyFor(globals).PostCard.moreOptions }));
    },
};

export const ConfirmDelete: Story = {
    args: { post: myPost },
    play: async ({ canvasElement, globals }) => {
        const t = copyFor(globals).PostCard;
        await userEvent.click(within(canvasElement).getByRole('button', { name: t.moreOptions }));
        await userEvent.click(await within(document.body).findByRole('menuitem', { name: t.deletePost }));
    },
};

// Hosts can pin any post and remove it.
export const HostView: Story = {
    args: { post: storyPost({ author: guestAuthor, authorMemberId: guestAuthor.memberId }) },
    parameters: { app: { member: storyHostMember } },
};

// Reacting is off while the event is a draft.
export const DraftEvent: Story = {
    parameters: { app: { event: storyEvent({ status: 'DRAFT' }) } },
};
