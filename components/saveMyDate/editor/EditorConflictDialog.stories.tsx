import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, fn, userEvent, within } from 'storybook/test';

import { copyFor } from '@/.storybook/copy';
import { waitForOpen } from '@/.storybook/waitForOpen';
import { EditorConflictDialog } from '@/components/saveMyDate/editor/EditorConflictDialog';

const meta = {
    title: 'SaveMyDate/Editor/EditorConflictDialog',
    component: EditorConflictDialog,
    args: { open: true, onReload: fn() },
} satisfies Meta<typeof EditorConflictDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    play: async ({ args, globals }) => {
        const dialog = await waitForOpen('dialog');
        await userEvent.click(within(dialog).getByRole('button', { name: copyFor(globals).InvitationEditor.conflictReload }));
        await expect(args.onReload).toHaveBeenCalledOnce();
    },
};

// The spinner turns, so the visual check skips it.
export const Reloading: Story = {
    args: { isReloading: true },
    tags: ['visual-skip'],
    play: async () => {
        await waitForOpen('dialog');
    },
};
