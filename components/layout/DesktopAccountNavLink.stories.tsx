import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Bell } from 'lucide-react';

import { DesktopAccountNavLink } from '@/components/layout/DesktopAccountNavLink';

// The link sits on the rail's warm gradient; a plain surface would hide its white text.
const meta = {
    title: 'Layout/DesktopAccountNavLink',
    component: DesktopAccountNavLink,
    args: { href: '/notifications', icon: Bell, label: 'Notifications', active: false, expanded: true },
    decorators: [
        (Story, { args }) => (
            <div className={args.expanded ? 'w-60 rounded-3xl p-4' : 'w-20 rounded-3xl p-4'} style={{ background: 'linear-gradient(180deg, #f29573, #fcc777)' }}>
                <Story />
            </div>
        ),
    ],
} satisfies Meta<typeof DesktopAccountNavLink>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Expanded: Story = {};

export const Active: Story = {
    args: { active: true },
};

export const WithCount: Story = {
    args: { badgeCount: 3 },
};

export const Collapsed: Story = {
    args: { expanded: false },
};

export const CollapsedWithManyUnread: Story = {
    args: { expanded: false, badgeCount: 24 },
};
