import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { Countdown } from '@/components/feed/Countdown';

// The story clock is fixed at 2026-06-15 12:00 UTC (see preview.tsx).
const meta = {
    title: 'Feed/Countdown',
    component: Countdown,
    args: { eventId: 'evt-story', time: Date.parse('2026-07-04T15:00:00Z') },
} satisfies Meta<typeof Countdown>;

export default meta;
type Story = StoryObj<typeof meta>;

export const CountingDown: Story = {};

export const LastMinutes: Story = {
    args: { time: Date.parse('2026-06-15T12:04:30Z') },
};

// Within half an hour of the start, fireworks play once per browser.
export const JustStarted: Story = {
    args: { time: Date.parse('2026-06-15T11:50:00Z') },
    parameters: { chromatic: { disableSnapshot: true } },
    beforeEach() {
        window.localStorage.removeItem('countdown-celebrated:evt-story');
    },
};

// Long after the start: the label, without the fireworks.
export const Started: Story = {
    args: { time: Date.parse('2026-06-01T15:00:00Z') },
};
