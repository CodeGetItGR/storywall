import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { CalendarDays } from 'lucide-react';

import { ContextTabLink } from '@/components/layout/mobile-tab-bar/ContextTabLink';

const meta = {
    title: 'Layout/MobileTabBar/ContextTabLink',
    component: ContextTabLink,
    args: {
        item: { key: 'schedule', href: '/events/evt-story/tools/schedule', icon: CalendarDays, label: 'Schedule' },
        label: 'Schedule',
        active: false,
    },
} satisfies Meta<typeof ContextTabLink>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Active: Story = {
    args: { active: true },
};
