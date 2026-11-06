import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';

import { PublishQueueCard } from '@/components/feed/PublishQueueCard';
import type { PostPublishJob, SongPublishJob, StoryPublishJob } from '@/providers/publishQueue/PublishQueueContext';

const postJob: PostPublishJob = {
    id: 'job-post',
    kind: 'post',
    status: 'pending',
    createdAt: 0,
    payload: { eventId: 'evt-story', authorMemberId: 'mem-guest', caption: 'Cake time!', images: [] },
};

const storyJob: StoryPublishJob = {
    id: 'job-story',
    kind: 'story',
    status: 'pending',
    createdAt: 0,
    postedCount: 0,
    totalCount: 3,
    payload: { eventId: 'evt-story', authorMemberId: 'mem-guest', items: [] },
};

const songJob: SongPublishJob = {
    id: 'job-song',
    kind: 'song',
    status: 'pending',
    createdAt: 0,
    payload: { eventId: 'evt-story', title: 'Dancing Queen', artist: 'ABBA' },
};

const meta = {
    title: 'Feed/PublishQueueCard',
    component: PublishQueueCard,
    args: { job: postJob, onRetry: fn(), onDismiss: fn() },
    decorators: [
        (Story) => (
            <div className="mx-auto max-w-2xl">
                <Story />
            </div>
        ),
    ],
} satisfies Meta<typeof PublishQueueCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const PostingPost: Story = {};

export const ServerBusy: Story = {
    args: { job: { ...postJob, busy: true } },
};

export const Posted: Story = {
    args: { job: { ...postJob, status: 'success' } },
};

export const PostFailed: Story = {
    args: { job: { ...postJob, status: 'error' } },
};

export const PostingStories: Story = {
    args: { job: storyJob },
};

export const StoriesPosted: Story = {
    args: { job: { ...storyJob, status: 'success', postedCount: 3 } },
};

export const StoriesFailed: Story = {
    args: { job: { ...storyJob, status: 'error' } },
};

export const AddingSong: Story = {
    args: { job: songJob },
};

export const SongFailed: Story = {
    args: { job: { ...songJob, status: 'error' } },
};
