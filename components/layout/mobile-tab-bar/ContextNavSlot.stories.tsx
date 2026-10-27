import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { BookHeart, CalendarDays } from 'lucide-react';
import { fn } from 'storybook/test';

import { mobileOnly } from '@/.storybook/modes';
import { ContextNavSlot } from '@/components/layout/mobile-tab-bar/ContextNavSlot';

const schedule = { key: 'schedule', href: '/events/evt-story/tools/schedule', icon: CalendarDays, label: 'Schedule' };
const wishbook = { key: 'wishbook', href: '/events/evt-story/tools/wishbook', icon: BookHeart, label: 'Wishbook' };

const meta = {
    title: 'Layout/MobileTabBar/ContextNavSlot',
    component: ContextNavSlot,
    args: {
        active: false,
        items: [schedule, wishbook],
        menuLabel: 'Tools',
        pathname: '/events/evt-story/feed',
        searchParams: '',
        onItemClick: fn(),
    },
    globals: { viewport: { value: 'mobile' } },
    parameters: mobileOnly,
} satisfies Meta<typeof ContextNavSlot>;

export default meta;
type Story = StoryObj<typeof meta>;

// Several tools open a menu.
export const Menu: Story = {};

// A single tool is a plain link.
export const SingleTool: Story = {
    args: { items: [schedule] },
};

export const SingleToolActive: Story = {
    args: { items: [schedule], pathname: '/events/evt-story/tools/schedule' },
};
