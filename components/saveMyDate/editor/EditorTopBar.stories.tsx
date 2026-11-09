import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, fn, userEvent, within } from 'storybook/test';

import { copyFor } from '@/.storybook/copy';
import { withEditorChrome } from '@/.storybook/editor';
import { EditorTopBar } from '@/components/saveMyDate/editor/EditorTopBar';

const meta = {
    title: 'SaveMyDate/Editor/EditorTopBar',
    component: EditorTopBar,
    decorators: [withEditorChrome],
    parameters: { layout: 'fullscreen' },
    args: {
        status: 'saved',
        canUndo: true,
        canRedo: false,
        onBack: fn(),
        onUndo: fn(),
        onRedo: fn(),
        onPreview: fn(),
        onPublish: fn(),
    },
} satisfies Meta<typeof EditorTopBar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Saved: Story = {
    play: async ({ args, canvasElement, globals }) => {
        const copy = copyFor(globals).InvitationEditor;
        const canvas = within(canvasElement);
        await userEvent.click(canvas.getByRole('button', { name: copy.undo }));
        await expect(args.onUndo).toHaveBeenCalledOnce();
        await expect(canvas.getByRole('button', { name: copy.redo })).toBeDisabled();
    },
};

export const Unsaved: Story = {
    args: { status: 'unsaved', canRedo: true },
};

// Waiting for the save before preview or publish. The spinner turns, so the visual check skips it.
export const SavingFirst: Story = {
    args: { status: 'saving', isBusy: true },
    tags: ['visual-skip'],
};

export const NothingToUndo: Story = {
    args: { canUndo: false },
};
