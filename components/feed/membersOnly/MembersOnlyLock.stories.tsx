import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { MembersOnlyLock } from '@/components/feed/membersOnly/MembersOnlyLock';

const meta = {
    title: 'Feed/MembersOnly/MembersOnlyLock',
    component: MembersOnlyLock,
    args: { title: 'Dress code', joinHref: '/q/story-token' },
    decorators: [
        (Story) => (
            <div className="mx-auto max-w-2xl bg-event py-4">
                <Story />
            </div>
        ),
    ],
} satisfies Meta<typeof MembersOnlyLock>;

export default meta;
type Story = StoryObj<typeof meta>;

// In place of a members-only section.
export const Section: Story = {};

// At the end of the signed-out page, for the photos and posts.
export const Feed: Story = { args: { title: 'Photos and posts' } };
