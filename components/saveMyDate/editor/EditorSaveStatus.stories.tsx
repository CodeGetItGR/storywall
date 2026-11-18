import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, within } from 'storybook/test';

import { copyFor } from '@/.storybook/copy';
import { withEditorChrome } from '@/.storybook/editor';
import { EditorSaveStatus } from '@/components/saveMyDate/editor/EditorSaveStatus';

const meta = {
    title: 'SaveMyDate/Editor/EditorSaveStatus',
    component: EditorSaveStatus,
    decorators: [withEditorChrome],
    args: { status: 'saved' },
} satisfies Meta<typeof EditorSaveStatus>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Saved: Story = {
    play: async ({ canvasElement, globals }) => {
        await expect(within(canvasElement).getByRole('status')).toHaveTextContent(copyFor(globals).InvitationEditor.saved);
    },
};

// The spinner turns, so the visual check skips it.
export const Saving: Story = {
    args: { status: 'saving' },
    tags: ['visual-skip'],
};

export const Unsaved: Story = {
    args: { status: 'unsaved' },
};
