import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, fn, userEvent, within } from 'storybook/test';

import { copyFor } from '@/.storybook/copy';
import { withEditorChrome } from '@/.storybook/editor';
import { waitForOpen } from '@/.storybook/waitForOpen';
import { TextColorPicker } from '@/components/saveMyDate/editor/text/TextColorPicker';
import { BASE_TEXT_COLORS } from '@/lib/invitation/textEditing';

const meta = {
    title: 'SaveMyDate/Editor/Text/TextColorPicker',
    component: TextColorPicker,
    decorators: [withEditorChrome],
    args: { value: '#2f2b2d', swatches: ['#b8dfd3', '#efe7ec', ...BASE_TEXT_COLORS], onPick: fn() },
} satisfies Meta<typeof TextColorPicker>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

// The theme's colours, the ones in use and the old editor's own, for this text by default.
export const Open: Story = {
    play: async ({ canvasElement, globals }) => {
        await userEvent.click(within(canvasElement).getByRole('button', { name: copyFor(globals).InvitationEditor.textColor }));
        await waitForOpen('dialog');
    },
};

// The colour goes to every text of the invitation.
export const EveryText: Story = {
    play: async ({ args, canvasElement, globals }) => {
        const copy = copyFor(globals).InvitationEditor;
        await userEvent.click(within(canvasElement).getByRole('button', { name: copy.textColor }));
        const popup = within(await waitForOpen('dialog'));
        await userEvent.click(popup.getByRole('radio', { name: copy.everyText }));
        await expect(popup.getByRole('radio', { name: copy.everyText })).toBeChecked();
        await expect(args.onPick).not.toHaveBeenCalled();
    },
};

// The full picker, applied only on Apply.
export const MoreColors: Story = {
    play: async ({ canvasElement, globals }) => {
        const copy = copyFor(globals).InvitationEditor;
        await userEvent.click(within(canvasElement).getByRole('button', { name: copy.textColor }));
        const popup = within(await waitForOpen('dialog'));
        await userEvent.click(popup.getByRole('button', { name: copy.moreColors }));
        await expect(popup.getByRole('button', { name: copy.apply })).toBeVisible();
    },
};
