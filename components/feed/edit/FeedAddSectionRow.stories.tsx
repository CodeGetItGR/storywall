import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';

import { FeedAddSectionRow } from '@/components/feed/edit/FeedAddSectionRow';

const meta = {
    title: 'Feed/Edit/FeedAddSectionRow',
    component: FeedAddSectionRow,
    args: { onAdd: fn() },
} satisfies Meta<typeof FeedAddSectionRow>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Open: Story = {};
