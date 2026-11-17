import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { EventInfo } from '@/components/feed/EventInfo';

const meta = {
    title: 'Feed/EventInfo',
    component: EventInfo,
    args: { date: Date.parse('2026-07-04T15:00:00Z'), place: 'Santorini' },
    decorators: [
        (Story) => (
            <div className="max-w-md">
                <Story />
            </div>
        ),
    ],
} satisfies Meta<typeof EventInfo>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const NoPlace: Story = {
    args: { place: '' },
};

export const LongPlace: Story = {
    args: { place: 'Agios Nikolaos church, Oia, Santorini, Cyclades, Greece' },
};
