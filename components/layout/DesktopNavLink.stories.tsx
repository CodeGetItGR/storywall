import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { CalendarDays } from 'lucide-react';

import { DesktopNavLink } from '@/components/layout/DesktopNavLink';

const meta = {
    title: 'Layout/DesktopNavLink',
    component: DesktopNavLink,
    args: { href: '/home', icon: CalendarDays, label: 'Events', active: false },
    decorators: [
        (Story) => (
            <div className="w-56">
                <Story />
            </div>
        ),
    ],
} satisfies Meta<typeof DesktopNavLink>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Active: Story = {
    args: { active: true },
};
