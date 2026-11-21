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
        primary: { action: 'publish', onClick: fn() },
        onTour: fn(),
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

// An admin's live theme: Save instead of Publish, and no tour.
export const ThemeSave: Story = {
    args: { status: 'unsaved', primary: { action: 'save', onClick: fn() }, onTour: undefined },
};

// An admin's draft theme saves as it goes: no button at the end.
export const ThemeAutosave: Story = {
    args: { primary: undefined, onTour: undefined },
};
