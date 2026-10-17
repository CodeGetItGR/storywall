import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { delay, http, HttpResponse } from 'msw';

import { withAppContext } from '@/.storybook/appContext';
import { storyComment, storyEvent, storyPage, storyPhotos, storyPost } from '@/.storybook/fixtures';
import { PostModal } from '@/components/feed/PostModal';
import type { CommentResponseDto, PostResponseDto } from '@/lib/api/types';

const post = storyPost({ media: storyPhotos.slice(0, 3), commentCount: 3, reactionCount: 7, reactionCounts: { LOVE: 5, WOW: 2 } });
const comments = [
    storyComment('c1'),
    storyComment('c2', { content: 'The flowers look amazing.', author: { ...post.author!, displayName: 'Sofia Ioannou', memberId: 'mem-sofia' } }),
    storyComment('c3', { parentCommentId: 'c1', content: 'Agreed!' }),
];

function postHandlers(data: PostResponseDto, list: CommentResponseDto[]) {
    return [
        http.get('*/api/posts/:postId', () => HttpResponse.json(data)),
        http.get('*/api/posts/:postId/comments', () => HttpResponse.json(storyPage(list))),
    ];
}

// Opens from the `post` search param, like a shared post link.
const meta = {
    title: 'Feed/PostModal',
    component: PostModal,
    parameters: { layout: 'fullscreen', nextjs: { navigation: { query: { post: 'post-1' } } } },
    decorators: [withAppContext],
    beforeEach({ msw }) {
        msw.use(...postHandlers(post, comments));
    },
} satisfies Meta<typeof PostModal>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithComments: Story = {};

export const NoComments: Story = {
    beforeEach({ msw }) {
        msw.use(...postHandlers({ ...post, commentCount: 0 }, []));
    },
};

export const TextPost: Story = {
    beforeEach({ msw }) {
        msw.use(...postHandlers({ ...post, type: 'TEXT', media: [], content: 'Thank you all for coming. It was the best day of our lives!' }, comments));
    },
};

// Comments stay closed while the event is a draft.
export const DraftEvent: Story = {
    parameters: { app: { event: storyEvent({ status: 'DRAFT' }) } },
};

export const Loading: Story = {
    beforeEach({ msw }) {
        msw.use(
            http.get('*/api/posts/:postId', async () => {
                await delay('infinite');
                return HttpResponse.json(post);
            }),
        );
    },
};

export const NotFound: Story = {
    beforeEach({ msw }) {
        msw.use(http.get('*/api/posts/:postId', () => HttpResponse.json({ status: 404, errorCode: 'NOT_FOUND' }, { status: 404 })));
    },
};

export const LoadFailed: Story = {
    beforeEach({ msw }) {
        msw.use(http.get('*/api/posts/:postId', () => HttpResponse.json({ status: 500, errorCode: 'INTERNAL_ERROR' }, { status: 500 })));
    },
};
