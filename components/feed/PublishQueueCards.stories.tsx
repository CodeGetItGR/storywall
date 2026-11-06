import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { withAppContext } from '@/.storybook/appContext';
import { PublishQueueCards } from '@/components/feed/PublishQueueCards';

const meta = {
    title: 'Feed/PublishQueueCards',
    component: PublishQueueCards,
    parameters: {
        app: {
            publishJobs: [
                {
                    id: 'job-post',
                    kind: 'post',
                    status: 'error',
                    createdAt: 0,
                    payload: { eventId: 'evt-story', authorMemberId: 'mem-guest', caption: 'Cake time!', images: [] },
                },
                {
                    id: 'job-song',
                    kind: 'song',
                    status: 'pending',
                    createdAt: 1,
                    payload: { eventId: 'evt-story', title: 'Dancing Queen', artist: 'ABBA' },
                },
            ],
        },
    },
    decorators: [
        withAppContext,
        (Story) => (
            <div className="mx-auto max-w-2xl">
                <Story />
            </div>
        ),
    ],
} satisfies Meta<typeof PublishQueueCards>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Several: Story = {};
