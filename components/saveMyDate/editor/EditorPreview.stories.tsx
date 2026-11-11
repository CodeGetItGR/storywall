import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, fn, userEvent, within } from 'storybook/test';

import { copyFor } from '@/.storybook/copy';
import { storyDraft } from '@/.storybook/editor';
import { waitForOpen } from '@/.storybook/waitForOpen';
import { EditorPreview } from '@/components/saveMyDate/editor/EditorPreview';

const draft = storyDraft();

const meta = {
    title: 'SaveMyDate/Editor/EditorPreview',
    component: EditorPreview,
    parameters: { layout: 'fullscreen' },
    args: { open: true, onClose: fn(), document: draft.document, theme: draft.theme, media: draft.media },
    play: async () => {
        await expect(await waitForOpen('dialog')).toBeVisible();
    },
} satisfies Meta<typeof EditorPreview>;

export default meta;
type Story = StoryObj<typeof meta>;

// At phone width, the way it opens.
export const Open: Story = {};

// At computer width. Phones don't have the switch.
export const Desktop: Story = {
    tags: ['visual-desktop-only'],
    args: { initialWidth: 'desktop' },
};

// The switch changes the width.
export const SwitchWidth: Story = {
    tags: ['visual-skip'],
    play: async ({ globals }) => {
        const copy = copyFor(globals).InvitationEditor;
        const dialog = within(await waitForOpen('dialog'));
        await userEvent.click(dialog.getByRole('button', { name: copy.previewDesktop }));
        await expect(dialog.getByRole('button', { name: copy.previewDesktop })).toHaveAttribute('aria-pressed', 'true');
    },
};
