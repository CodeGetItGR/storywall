import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn, userEvent, within } from 'storybook/test';

import { copyFor } from '@/.storybook/copy';
import { withEditorChrome } from '@/.storybook/editor';
import { waitForOpen } from '@/.storybook/waitForOpen';
import { TextStyleMenu } from '@/components/saveMyDate/editor/text/TextStyleMenu';
import type { TextStylePresetDto } from '@/lib/api/types';

// Shared with FeedTextToolbar's stories.
export const STORY_PRESETS: TextStylePresetDto[] = [
    { id: 'a', nameEn: 'Classic', nameEl: 'Κλασικό', font: 'serif', size: 32, weight: 'NORMAL', italic: false, letterSpacing: 0, uppercase: false, sortOrder: 0 },
    { id: 'b', nameEn: 'Calligraphy', nameEl: 'Καλλιγραφικό', font: 'cursive', size: 40, weight: 'BOLD', italic: true, letterSpacing: 1, uppercase: false, sortOrder: 1 },
    { id: 'c', nameEn: 'Capitals', nameEl: 'Κεφαλαία', font: 'sans-serif', size: 16, weight: 'NORMAL', italic: false, letterSpacing: 3, uppercase: true, sortOrder: 2 },
];

const meta = {
    title: 'SaveMyDate/Editor/Text/TextStyleMenu',
    component: TextStyleMenu,
    decorators: [withEditorChrome],
    args: { presets: STORY_PRESETS, text: 'Μαρία & Νίκος', onPick: fn() },
} satisfies Meta<typeof TextStyleMenu>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

// Each preset drawn on the start of the text.
export const Open: Story = {
    play: async ({ canvasElement, globals }) => {
        await userEvent.click(within(canvasElement).getByRole('button', { name: copyFor(globals).FeedEditor.style }));
        await waitForOpen('dialog');
    },
};

// No presets yet.
export const Empty: Story = { args: { presets: [] } };
