import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';

import { withAppContext } from '@/.storybook/appContext';
import { STORY_EVENT_ID } from '@/.storybook/fixtures';
import { ManageSectionList } from '@/components/manage/nav/ManageSectionList';
import type { ManageNavGroup } from '@/lib/manageSections';

const groups: ManageNavGroup[] = [
    { key: 'event', items: ['overview', 'settings', 'theme', 'billing'] },
    { key: 'people', items: ['rsvp', 'invitationsQr', 'members', 'vendors'] },
];

const meta = {
    title: 'Manage/Nav/ManageSectionList',
    component: ManageSectionList,
    decorators: [
        withAppContext,
        (Story) => (
            <div className="bg-event p-4">
                <Story />
            </div>
        ),
    ],
    tags: ['visual-mobile-only'],
    globals: { viewport: { value: 'mobile' } },
    args: { eventId: STORY_EVENT_ID, groups, showDanger: true, onSelectSection: fn() },
} satisfies Meta<typeof ManageSectionList>;

export default meta;
type Story = StoryObj<typeof meta>;

export const PrimaryHost: Story = {};

// A lite event: no People entries, no Danger zone for a co-host.
export const LiteCoHost: Story = { args: { groups: [{ key: 'event', items: ['overview', 'settings', 'billing'] }], showDanger: false } };
