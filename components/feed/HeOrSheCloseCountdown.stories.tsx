import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { HeOrSheCloseCountdown } from '@/components/feed/HeOrSheCloseCountdown';

// The story clock is fixed at 2026-06-15 12:00 UTC (see preview.tsx).
const meta = {
    title: 'Feed/HeOrSheCloseCountdown',
    component: HeOrSheCloseCountdown,
    args: { time: Date.parse('2026-06-18T20:30:00Z') },
} satisfies Meta<typeof HeOrSheCloseCountdown>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
