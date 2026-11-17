import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { TabLink } from '@/components/layout/mobile-tab-bar/TabLink';

const meta = {
    title: 'Layout/MobileTabBar/TabLink',
    component: TabLink,
    args: { href: '/events/evt-story/feed', icon: '/icons/home.svg', label: 'Home', active: false },
} satisfies Meta<typeof TabLink>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Active: Story = {
    args: { active: true },
};
