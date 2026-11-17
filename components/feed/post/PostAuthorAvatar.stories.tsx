import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { PostAuthorAvatar } from '@/components/feed/post/PostAuthorAvatar';

const meta = {
    title: 'Feed/Post/PostAuthorAvatar',
    component: PostAuthorAvatar,
    args: { name: 'Nikos Alexiou', timeAgo: { unit: 'hours', value: 2 } },
    decorators: [
        (Story) => (
            <div className="max-w-sm">
                <Story />
            </div>
        ),
    ],
} satisfies Meta<typeof PostAuthorAvatar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Initials: Story = {};

export const WithPhoto: Story = {
    args: { avatarUrl: '/images/post-tux.png' },
};

// Guests see a star in place of the host's avatar.
export const HostPost: Story = {
    args: { name: 'Eleni Georgiou', isHostPost: true },
};

export const WithNickname: Story = {
    args: { subtitle: 'Best man' },
};

export const JustNow: Story = {
    args: { timeAgo: { unit: 'now', value: 0 } },
};

export const LongName: Story = {
    args: { name: 'Alexandra Konstantinopoulou-Hatzigeorgiou', subtitle: 'Maid of honour' },
};
