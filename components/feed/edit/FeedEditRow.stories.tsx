import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';

import { FeedEditRow } from '@/components/feed/edit/FeedEditRow';

const meta = {
    title: 'Feed/Edit/FeedEditRow',
    component: FeedEditRow,
    parameters: { layout: 'fullscreen' },
    args: { saving: false, failed: false, previewing: false, onPreview: fn(), onTheme: fn(), onCancel: fn(), onSave: fn() },
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

export const Previewing: Story = { args: { previewing: true } };

export const Saving: Story = { args: { saving: true } };

export const SaveFailed: Story = { args: { failed: true } };

// A 360 px phone, the narrowest all four must fit on (the Greek words are the longest).
const onNarrowPhone: Story = {
    tags: ['visual-mobile-only'],
    decorators: [
        (Story) => (
            <div className="w-[360px]">
                <Story />
            </div>
        ),
    ],
    globals: { viewport: { value: 'mobile' } },
};

export const NarrowPhone: Story = onNarrowPhone;

export const NarrowPhoneSaving: Story = { ...onNarrowPhone, args: { saving: true } };

// An event without Save my date: no Theme.
export const WithoutTheme: Story = { args: { onTheme: undefined } };
