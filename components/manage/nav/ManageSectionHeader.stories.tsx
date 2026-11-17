import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';

import { STORY_EVENT_ID } from '@/.storybook/fixtures';
import { ManageSectionHeader } from '@/components/manage/nav/ManageSectionHeader';

const meta = {
    title: 'Manage/Nav/ManageSectionHeader',
    component: ManageSectionHeader,
    tags: ['visual-mobile-only'],
    globals: { viewport: { value: 'mobile' } },
    args: { eventId: STORY_EVENT_ID, title: 'Members', onSelectSection: fn() },
} satisfies Meta<typeof ManageSectionHeader>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

// The longest existing entry name wraps onto two lines.
export const LongTitle: Story = { args: { title: 'Given as a gift' } };
