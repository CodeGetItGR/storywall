import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';

import { withAppContext } from '@/.storybook/appContext';
import { STORY_EVENT_ID } from '@/.storybook/fixtures';
import { ManageSidebar } from '@/components/manage/nav/ManageSidebar';
import type { ManageNavGroup } from '@/lib/manageSections';

const groups: ManageNavGroup[] = [
    { key: 'event', items: ['overview', 'settings', 'theme', 'billing'] },
    { key: 'people', items: ['rsvp', 'invitation', 'shareLinks', 'members', 'vendors'] },
];

const meta = {
    title: 'Manage/Nav/ManageSidebar',
    component: ManageSidebar,
    decorators: [
        withAppContext,
        (Story) => (
            <div className="w-56 bg-event p-4">
                <Story />
            </div>
        ),
    ],
    tags: ['visual-desktop-only'],
    globals: { viewport: { value: 'desktop' } },
    args: { eventId: STORY_EVENT_ID, groups, showDanger: true, active: 'settings', onSelectSection: fn() },
} satisfies Meta<typeof ManageSidebar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const PrimaryHost: Story = {};

export const CoHost: Story = { args: { showDanger: false, active: 'vendors' } };
