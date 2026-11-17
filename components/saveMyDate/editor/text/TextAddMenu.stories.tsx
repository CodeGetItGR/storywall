import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, fn, userEvent, within } from 'storybook/test';

import { copyFor } from '@/.storybook/copy';
import { withEditorChrome } from '@/.storybook/editor';
import { waitForOpen } from '@/.storybook/waitForOpen';
import { TextAddMenu } from '@/components/saveMyDate/editor/text/TextAddMenu';

const meta = {
    title: 'SaveMyDate/Editor/Text/TextAddMenu',
    component: TextAddMenu,
    decorators: [withEditorChrome],
    args: { disabled: false, onAdd: fn() },
} satisfies Meta<typeof TextAddMenu>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

// The kinds of text, each shown at about its size.
export const Open: Story = {
    play: async ({ canvasElement, globals }) => {
        await userEvent.click(within(canvasElement).getByRole('button', { name: copyFor(globals).InvitationEditor.addText }));
        await waitForOpen('dialog');
    },
};

export const AddsATitle: Story = {
    tags: ['visual-skip'],
    play: async ({ args, canvasElement, globals }) => {
        const copy = copyFor(globals).InvitationEditor;
        await userEvent.click(within(canvasElement).getByRole('button', { name: copy.addText }));
        const menu = await waitForOpen('dialog');
        await userEvent.click(within(menu).getByRole('button', { name: copy.addTitle }));
        await expect(args.onAdd).toHaveBeenCalledWith('title');
    },
};

// The section takes no more texts, or is locked.
export const Disabled: Story = { args: { disabled: true } };
