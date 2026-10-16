import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { Header } from '@/components/feed/Header';

// The story clock is fixed at 2026-06-15 12:00 UTC (see preview.tsx).
const meta = {
    title: 'Feed/Header',
    component: Header,
    args: { eventId: 'evt-story', countdownTime: Date.parse('2026-07-04T15:00:00Z') },
    parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof Header>;

export default meta;
type Story = StoryObj<typeof meta>;

export const CountingDown: Story = {};

export const Started: Story = {
    args: { countdownTime: Date.parse('2026-06-01T15:00:00Z') },
};
