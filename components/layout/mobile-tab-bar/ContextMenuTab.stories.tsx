import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { BookHeart, CalendarDays, Gift, Settings } from 'lucide-react';
import { fn, userEvent, within } from 'storybook/test';

import { mobileOnly } from '@/.storybook/modes';
import { ContextMenuTab } from '@/components/layout/mobile-tab-bar/ContextMenuTab';
import type { ContextNavItem } from '@/components/layout/mobile-tab-bar/types';

const items: ContextNavItem[] = [
    { key: 'schedule', href: '/events/evt-story/tools/schedule', icon: CalendarDays, label: 'Schedule', description: 'Times and places' },
    { key: 'wishbook', href: '/events/evt-story/tools/wishbook', icon: BookHeart, label: 'Wishbook', description: 'Leave a wish for the couple' },
    { key: 'gifts', href: '/events/evt-story/tools/gifts', icon: Gift, label: 'Gifts', description: 'Gift account details' },
];

const meta = {
    title: 'Layout/MobileTabBar/ContextMenuTab',
    component: ContextMenuTab,
    args: {
        active: false,
        items,
        label: 'Tools',
        pathname: '/events/evt-story/feed',
        searchParams: '',
        onItemClick: fn(),
    },
    globals: { viewport: { value: 'mobile' } },
    parameters: { layout: 'fullscreen', ...mobileOnly },
    decorators: [
        (Story) => (
            <div className="flex h-screen items-end justify-end p-4">
                <Story />
            </div>
        ),
    ],
} satisfies Meta<typeof ContextMenuTab>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Closed: Story = {};

export const Open: Story = {
    async play({ canvasElement }) {
        await userEvent.click(within(canvasElement).getByRole('button', { name: 'Tools' }));
    },
};

// The current page is marked in the menu.
export const OpenOnAToolPage: Story = {
    args: { active: true, pathname: '/events/evt-story/tools/wishbook', TriggerIcon: Settings },
    play: Open.play,
};
