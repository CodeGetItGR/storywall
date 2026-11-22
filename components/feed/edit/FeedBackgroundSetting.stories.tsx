import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';

import { withEditorChrome } from '@/.storybook/editor';
import { FeedBackgroundSetting } from '@/components/feed/edit/FeedBackgroundSetting';

const meta = {
    title: 'Feed/Edit/FeedBackgroundSetting',
    component: FeedBackgroundSetting,
    decorators: [withEditorChrome],
    args: { value: undefined, onChange: fn() },
} satisfies Meta<typeof FeedBackgroundSetting>;

export default meta;
type Story = StoryObj<typeof meta>;

export const ThemeBackgrounds: Story = {};
export const Picked: Story = { args: { value: '#F5E6D3' } };
export const TooDark: Story = { args: { value: '#1B2A4A' } };
