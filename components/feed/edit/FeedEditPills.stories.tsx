import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';

import { FeedEditPills } from '@/components/feed/edit/FeedEditPills';

const meta = {
    title: 'Feed/Edit/FeedEditPills',
    component: FeedEditPills,
    args: { saving: false, failed: false, onCancel: fn(), onSave: fn() },
} satisfies Meta<typeof FeedEditPills>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Idle: Story = {};
export const Saving: Story = { args: { saving: true } };
export const Failed: Story = { args: { failed: true } };
export const WithTheme: Story = { args: { onTheme: fn() } };
