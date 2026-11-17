import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, fn, userEvent, within } from 'storybook/test';

import { copyFor } from '@/.storybook/copy';
import { waitForOpen } from '@/.storybook/waitForOpen';
import { EditorLeaveDialog } from '@/components/saveMyDate/editor/EditorLeaveDialog';

const meta = {
    title: 'SaveMyDate/Editor/EditorLeaveDialog',
    component: EditorLeaveDialog,
    args: { open: true, onLeave: fn(), onStay: fn() },
} satisfies Meta<typeof EditorLeaveDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    play: async () => {
        await expect(await waitForOpen('dialog')).toBeVisible();
    },
};

// The page decides where Leave goes; the dialog only reports it.
export const Leave: Story = {
    tags: ['visual-skip'],
    play: async ({ args, globals }) => {
        const dialog = await waitForOpen('dialog');
        await userEvent.click(within(dialog).getByText(copyFor(globals).InvitationEditor.leave));
        await expect(args.onLeave).toHaveBeenCalledOnce();
    },
};
