import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { BookHeart, CalendarCheck, CalendarDays, Gift } from 'lucide-react';

import { MemberActionsSection } from '@/components/layout/right-context-panel/MemberActionsSection';

const meta = {
    title: 'Layout/RightContextPanel/MemberActionsSection',
    component: MemberActionsSection,
    args: {
        items: [
            { key: 'rsvp', href: '/events/evt-story/tools/rsvp/submit', icon: CalendarCheck, label: 'RSVP', description: '' },
            { key: 'schedule', href: '/events/evt-story/tools/schedule', icon: CalendarDays, label: 'Schedule', description: '' },
            { key: 'wishbook', href: '/events/evt-story/tools/wishbook', icon: BookHeart, label: 'Wishbook', description: '' },
            { key: 'gifts', href: '/events/evt-story/tools/gifts', icon: Gift, label: 'Gifts', description: '' },
        ],
    },
    decorators: [
        (Story) => (
            <div className="max-w-xs">
                <Story />
            </div>
        ),
    ],
} satisfies Meta<typeof MemberActionsSection>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
