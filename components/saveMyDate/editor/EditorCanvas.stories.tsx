import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, within } from 'storybook/test';

import { storyDraft, withEditorChrome, withEditorScreen } from '@/.storybook/editor';
import { EditorCanvas } from '@/components/saveMyDate/editor/EditorCanvas';

const draft = storyDraft();

const meta = {
    title: 'SaveMyDate/Editor/EditorCanvas',
    component: EditorCanvas,
    decorators: [withEditorChrome, withEditorScreen],
    parameters: { layout: 'fullscreen' },
    args: { document: draft.document, theme: draft.theme, media: draft.media },
} satisfies Meta<typeof EditorCanvas>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    play: async ({ canvasElement }) => {
        await expect(within(canvasElement).getByRole('main')).toBeVisible();
    },
};
