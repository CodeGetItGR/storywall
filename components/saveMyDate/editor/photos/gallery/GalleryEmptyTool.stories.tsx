import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { useState } from 'react';
import { expect, within } from 'storybook/test';
import { useStore } from 'zustand';

import { withAppContext } from '@/.storybook/appContext';
import { copyFor } from '@/.storybook/copy';
import { storyDraft, withEditorScreen } from '@/.storybook/editor';
import { EditorCanvas } from '@/components/saveMyDate/editor/EditorCanvas';
import { CanvasHandles } from '@/components/saveMyDate/editor/handles/CanvasHandles';
import type { PhotoUploadSlots } from '@/hooks/usePhotoUploads';
import { PhotoUploadsContext } from '@/hooks/usePhotoUploadsContext';
import type { InvitationDocument } from '@/lib/invitation/document';
import { createInvitationEditorStore } from '@/lib/invitation/editorStore';
import { photoSlotKey } from '@/lib/invitation/photoSlots';
import { createPhotoUploadStore } from '@/lib/invitation/photoUploadStore';

const draft = storyDraft();

// Only the gallery, with no photos yet.
const EMPTY_GALLERY: InvitationDocument = {
    ...draft.document,
    sections: draft.document.sections
        .filter((section) => section.type === 'gallery')
        .map((section) => (section.type === 'gallery' ? { ...section, data: { ...section.data, images: [] } } : section)),
};

type EmptyGalleryProps = {
    // The first photo being added, this far along.
    adding?: number;
};

// An empty gallery on the editor canvas: a box to add its first photos.
function EmptyGalleryCanvas({ adding }: EmptyGalleryProps) {
    const [store] = useState(() => createInvitationEditorStore(EMPTY_GALLERY));
    const document = useStore(store, (state) => state.document);
    const [slots] = useState<PhotoUploadSlots>(() => {
        const uploads = createPhotoUploadStore();
        if (adding !== undefined)
            uploads.getState().set(photoSlotKey({ kind: 'galleryAdd', sectionId: 's-gallery', id: 'story' }), { percent: adding });
        return { uploads, upload: async () => {}, canPick: () => false, report: () => {} };
    });

    return (
        <div className="smd-editor flex h-full">
            <PhotoUploadsContext.Provider value={slots}>
                <CanvasHandles store={store} frames={draft.theme.frames}>
                    <EditorCanvas document={document} theme={draft.theme} media={draft.media} />
                </CanvasHandles>
            </PhotoUploadsContext.Provider>
        </div>
    );
}

const meta = {
    title: 'SaveMyDate/Editor/Photos/GalleryEmptyTool',
    component: EmptyGalleryCanvas,
    decorators: [withEditorScreen, withAppContext],
    parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof EmptyGalleryCanvas>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {
    play: async ({ canvasElement, globals }) => {
        const copy = copyFor(globals).InvitationEditor.photos.gallery;
        await expect(within(canvasElement).getByRole('button', { name: copy.add })).toBeVisible();
    },
};

export const Uploading: Story = { args: { adding: 60 } };
