import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { RsvpPrompt } from '@/components/feed/RsvpPrompt';

const meta = {
    title: 'Feed/RsvpPrompt',
    component: RsvpPrompt,
    args: { eventId: 'evt-story', deadline: '2026-06-25T21:00:00Z' },
    decorators: [
        (Story) => (
            <div className="mx-auto max-w-2xl">
                <Story />
            </div>
        ),
    ],
} satisfies Meta<typeof RsvpPrompt>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithDeadline: Story = {};

export const NoDeadline: Story = {
    args: { deadline: null },
};
