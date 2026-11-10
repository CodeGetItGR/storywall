import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, fn, userEvent, within } from 'storybook/test';

import { copyFor } from '@/.storybook/copy';
import { withEditorChrome } from '@/.storybook/editor';
import { waitForOpen } from '@/.storybook/waitForOpen';
import { TextFontPicker } from '@/components/saveMyDate/editor/text/TextFontPicker';
import { INVITATION_FONTS, THEME_FONT } from '@/lib/invitation/textEditing';

const meta = {
    title: 'SaveMyDate/Editor/Text/TextFontPicker',
    component: TextFontPicker,
    decorators: [withEditorChrome],
    args: { value: THEME_FONT, options: [...INVITATION_FONTS], onChange: fn() },
} satisfies Meta<typeof TextFontPicker>;

export default meta;
type Story = StoryObj<typeof meta>;

// The text follows the theme's font.
export const Default: Story = {};

// Its own font, named in that font.
export const OwnFont: Story = { args: { value: "'Playfair Display',serif", label: 'Playfair Display' } };

// Every font drawn in itself, the one in use ticked.
export const Open: Story = {
    args: { value: "'Playfair Display',serif", label: 'Playfair Display' },
    play: async ({ canvasElement, globals }) => {
        await userEvent.click(within(canvasElement).getByRole('button', { name: copyFor(globals).InvitationEditor.font }));
        await waitForOpen('dialog');
    },
};

export const PicksAFont: Story = {
    tags: ['visual-skip'],
    play: async ({ args, canvasElement, globals }) => {
        await userEvent.click(within(canvasElement).getByRole('button', { name: copyFor(globals).InvitationEditor.font }));
        const list = await waitForOpen('dialog');
        await userEvent.click(within(list).getByRole('button', { name: 'Lora' }));
        await expect(args.onChange).toHaveBeenCalledWith('Lora,serif');
    },
};
