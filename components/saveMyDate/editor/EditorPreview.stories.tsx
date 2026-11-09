import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, fn } from 'storybook/test';

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

export const Open: Story = {};
