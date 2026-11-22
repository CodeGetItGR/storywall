import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';

import { FeedAddSectionRow } from '@/components/feed/edit/FeedAddSectionRow';

const meta = {
    title: 'Feed/Edit/FeedAddSectionRow',
    component: FeedAddSectionRow,
    args: { locked: false, canBuy: true, onAdd: fn() },
} satisfies Meta<typeof FeedAddSectionRow>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Open: Story = {};
export const Locked: Story = { args: { locked: true } };
export const LockedForCoHost: Story = { args: { locked: true, canBuy: false } };
