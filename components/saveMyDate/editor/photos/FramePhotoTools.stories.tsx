import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { useState } from 'react';
import { expect, userEvent, within } from 'storybook/test';
import { useStore } from 'zustand';

import { withAppContext } from '@/.storybook/appContext';
import { copyFor } from '@/.storybook/copy';
import { storyDraft, withEditorScreen } from '@/.storybook/editor';
import { storyUser } from '@/.storybook/fixtures';
import { EditorCanvas } from '@/components/saveMyDate/editor/EditorCanvas';
import { CanvasHandles } from '@/components/saveMyDate/editor/handles/CanvasHandles';
import type { InvitationDocument } from '@/lib/invitation/document';
import { createInvitationEditorStore } from '@/lib/invitation/editorStore';
import type { PhotoFrameElement } from '@/lib/invitation/photoFrame';
import { previewMedia } from '@/lib/saveMyDatePreview';

const draft = storyDraft();
// The sample draft has no frame images; the staging preview's are drawn in place.
const media = (mediaId: string) => draft.media(mediaId) ?? previewMedia(mediaId);

type FrameStoryProps = {
    // Which sections show: the photo frame, the photo band or both.
    sections: readonly string[];
    frame?: Partial<PhotoFrameElement>;
};

function documentWith({ sections, frame = {} }: FrameStoryProps): InvitationDocument {
    return {
        ...draft.document,
        sections: draft.document.sections
            .filter((section) => sections.includes(section.id))
            .map((section) => ({
                ...section,
                elements: section.elements.map((element) => (element.kind === 'photoFrame' ? { ...element, ...frame } : element)),
            })),
    };
}

// The editor canvas with the photo tools, on an editor store, so the photo can be moved and zoomed.
function FrameCanvas(props: FrameStoryProps) {
    const [store] = useState(() => createInvitationEditorStore(documentWith(props)));
    const document = useStore(store, (state) => state.document);
    return (
        <div className="smd-editor flex h-full">
            <CanvasHandles store={store} frames={draft.theme.frames}>
                <EditorCanvas document={document} theme={draft.theme} media={media} />
            </CanvasHandles>
        </div>
    );
}

const meta = {
    title: 'SaveMyDate/Editor/Photos/FramePhotoTools',
    component: FrameCanvas,
    decorators: [withEditorScreen, withAppContext],
    parameters: { layout: 'fullscreen' },
    args: { sections: ['s-photoFrame'] },
} satisfies Meta<typeof FrameCanvas>;

export default meta;
type Story = StoryObj<typeof meta>;

const ADMIN = { app: { user: { ...storyUser, role: 'ADMIN' as const } } };

// A host moves and zooms the photo; the zoom out button waits until it is zoomed in.
export const Host: Story = {
    play: async ({ canvasElement, globals }) => {
        const copy = copyFor(globals).InvitationEditor.photos;
        const canvas = within(canvasElement);
        await expect(canvas.getByRole('button', { name: copy.zoomOut })).toBeDisabled();
        await userEvent.click(canvas.getByRole('button', { name: copy.zoomIn }));
        await expect(canvas.getByRole('button', { name: copy.zoomOut })).toBeEnabled();
        await expect(canvas.queryByRole('combobox')).not.toBeInTheDocument();
    },
};

export const ZoomedIn: Story = {
    args: { frame: { zoom: 2, imageX: 20, imageY: 70 } },
};

// An admin also picks the frame and its effect.
export const Admin: Story = {
    parameters: ADMIN,
    play: async ({ canvasElement, globals }) => {
        const copy = copyFor(globals).InvitationEditor.photos;
        await expect(within(canvasElement).getByRole('combobox', { name: copy.frameEffect })).toBeVisible();
    },
};

// No frame chosen yet: an empty box for the admin to pick one in. Hosts don't see it.
export const NotChosen: Story = {
    args: { frame: { frameId: '' } },
    parameters: ADMIN,
};

// The photo band's move button, bottom left.
export const PhotoBand: Story = {
    args: { sections: ['s-photo'] },
    play: async ({ canvasElement, globals }) => {
        const copy = copyFor(globals).InvitationEditor.photos;
        await expect(within(canvasElement).getByRole('button', { name: copy.move })).toBeVisible();
    },
};
