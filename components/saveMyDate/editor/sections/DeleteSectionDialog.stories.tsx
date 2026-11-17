import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, fn, userEvent, within } from 'storybook/test';

import { copyFor } from '@/.storybook/copy';
import { waitForOpen } from '@/.storybook/waitForOpen';
import { DeleteSectionDialog } from '@/components/saveMyDate/editor/sections/DeleteSectionDialog';

const meta = {
    title: 'SaveMyDate/Editor/Sections/DeleteSectionDialog',
    component: DeleteSectionDialog,
    args: { open: true, sectionName: '', onDelete: fn(), onCancel: fn() },
    // The name in the picked language, as the editor passes it.
    render: (args, { globals }) => <DeleteSectionDialog {...args} sectionName={copyFor(globals).InvitationEditor.sectionNames.faq} />,
} satisfies Meta<typeof DeleteSectionDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    play: async () => {
        await expect(await waitForOpen('dialog')).toBeVisible();
    },
};

// The dialog only reports the answer; the editor deletes the section.
export const Delete: Story = {
    tags: ['visual-skip'],
    play: async ({ args, globals }) => {
        const dialog = await waitForOpen('dialog');
        await userEvent.click(within(dialog).getByRole('button', { name: copyFor(globals).InvitationEditor.sections.deleteConfirm }));
        await expect(args.onDelete).toHaveBeenCalledOnce();
    },
};
