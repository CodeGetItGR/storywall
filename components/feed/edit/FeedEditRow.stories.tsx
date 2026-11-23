import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';

import { FeedEditRow } from '@/components/feed/edit/FeedEditRow';

const meta = {
    title: 'Feed/Edit/FeedEditRow',
    component: FeedEditRow,
    args: { saving: false, failed: false, onTheme: fn(), onCancel: fn(), onSave: fn() },
    decorators: [
        (Story) => (
            <div className="mx-auto max-w-2xl bg-event py-2">
                <Story />
            </div>
        ),
    ],
} satisfies Meta<typeof FeedEditRow>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Editing: Story = {};

export const Saving: Story = { args: { saving: true } };

export const SaveFailed: Story = { args: { failed: true } };

// An event without Save my date: no Theme.
export const WithoutTheme: Story = { args: { onTheme: undefined } };
