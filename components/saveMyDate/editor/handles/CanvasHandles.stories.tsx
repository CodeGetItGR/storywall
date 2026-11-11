import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { useState } from 'react';
import { expect, within } from 'storybook/test';
import { useStore } from 'zustand';

import { withAppContext } from '@/.storybook/appContext';
import { copyFor } from '@/.storybook/copy';
import { storyDraft, withEditorScreen } from '@/.storybook/editor';
import { storyUser } from '@/.storybook/fixtures';
import { EditorCanvas } from '@/components/saveMyDate/editor/EditorCanvas';
import { CanvasHandles } from '@/components/saveMyDate/editor/handles/CanvasHandles';
import { createInvitationEditorStore } from '@/lib/invitation/editorStore';
import { previewMedia } from '@/lib/saveMyDatePreview';

const draft = storyDraft();
// The sections with handles inside them: an image, the two columns, a spacer, a decoration, a photo frame.
const HANDLE_SECTIONS = new Set(['s-blank-1', 's-blank-2', 's-blank-3', 's-parentsSimple', 's-photoFrame']);
const handleDocument = { ...draft.document, sections: draft.document.sections.filter((section) => HANDLE_SECTIONS.has(section.id)) };
// The sample draft has no frame images; the staging preview's are drawn in place.
const media = (mediaId: string) => draft.media(mediaId) ?? previewMedia(mediaId);

// The canvas with its handles, on an editor store, so every handle can be dragged.
function HandlesCanvas() {
    const [store] = useState(() => createInvitationEditorStore(handleDocument));
    const document = useStore(store, (state) => state.document);
    return (
        <div className="smd-editor flex h-full">
            <CanvasHandles store={store}>
                <EditorCanvas document={document} theme={draft.theme} media={media} />
            </CanvasHandles>
        </div>
    );
}

const meta = {
    title: 'SaveMyDate/Editor/Handles/CanvasHandles',
    component: HandlesCanvas,
    decorators: [withEditorScreen, withAppContext],
    parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof HandlesCanvas>;

export default meta;
type Story = StoryObj<typeof meta>;

// A host gets the spacer's bar and the photo frame's dot.
export const Host: Story = {
    play: async ({ canvasElement, globals }) => {
        const copy = copyFor(globals).InvitationEditor.handles;
        const canvas = within(canvasElement);
        await expect(canvas.getByRole('slider', { name: copy.spacerHeight })).toBeInTheDocument();
        await expect(canvas.queryByText(copy.twoColumns)).not.toBeInTheDocument();
    },
};

// An admin also resizes images and decorations, and moves custom section items.
export const Admin: Story = {
    parameters: { app: { user: { ...storyUser, role: 'ADMIN' } } },
    play: async ({ canvasElement, globals }) => {
        const copy = copyFor(globals).InvitationEditor.handles;
        const canvas = within(canvasElement);
        await expect(canvas.getAllByRole('slider', { name: copy.resize })).toHaveLength(3);
        await expect(canvas.getByText(copy.twoColumns)).toBeInTheDocument();
    },
};
