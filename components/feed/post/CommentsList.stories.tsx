import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn, userEvent, within } from 'storybook/test';

import { withAppContext } from '@/.storybook/appContext';
import { guestAuthor, storyAuthor, storyComment } from '@/.storybook/fixtures';
import { CommentsList } from '@/components/feed/post/CommentsList';

const sofia = storyAuthor({ memberId: 'mem-sofia', displayName: 'Sofia Ioannou', role: 'ATTENDEE', avatarUrl: '/images/post-tux.png' });
const comments = [
    storyComment('c1'),
    storyComment('c2', { author: sofia, authorMemberId: sofia.memberId, content: 'The flowers look amazing.' }),
    storyComment('c3', { parentCommentId: 'c1', author: storyAuthor(), authorMemberId: storyAuthor().memberId, content: 'Thank you, Nikos!' }),
    storyComment('c4', { parentCommentId: 'c1', author: sofia, authorMemberId: sofia.memberId, content: 'It really was.' }),
];

// Also shows CommentThreadItem and ReplyItem, as the comments view lays them out.
const meta = {
    title: 'Feed/Post/CommentsList',
    component: CommentsList,
    args: { comments, onReply: fn() },
    decorators: [
        withAppContext,
        (Story) => (
            <div className="mx-auto max-w-xl">
                <Story />
            </div>
        ),
    ],
} satisfies Meta<typeof CommentsList>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Threads: Story = {};

export const RepliesOpen: Story = {
    // The only button with a number in it is "View 2 replies", in either language.
    play: async ({ canvasElement }) => {
        await userEvent.click(within(canvasElement).getByRole('button', { name: /2/ }));
    },
};

// The two latest comments under a post in the feed.
export const Compact: Story = {
    args: { comments: comments.slice(0, 2), compact: true },
};

export const LongComment: Story = {
    args: {
        comments: [
            storyComment('c1', {
                author: guestAuthor,
                content:
                    'I still can’t believe how perfect everything was. The view, the music, the food, and the two of you dancing under the lights. Thank you for letting us be part of it!',
            }),
        ],
    },
};
