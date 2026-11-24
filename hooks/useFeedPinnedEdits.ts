'use client';

import { useCallback, useState } from 'react';

import { addPinnedPhoto, movePinnedPhoto, removePinnedPhoto } from '@/lib/feedPinned';
import type { InvitationEditorStore } from '@/lib/invitation/editorStore';
import type { ImageUploader } from '@/lib/invitation/editorUploads';
import { newElementId } from '@/lib/invitation/listIds';

// What the settings sheet does to the open Pinned photos section. Held in the store until Save.
export function useFeedPinnedEdits(store: InvitationEditorStore, sectionId: string | null, upload: ImageUploader) {
    const [uploading, setUploading] = useState(false);

    const add = useCallback(
        async (file: File) => {
            if (!sectionId) return;
            setUploading(true);
            try {
                const image = await upload(file);
                store.getState().edit(addPinnedPhoto(sectionId, newElementId(), image.mediaId));
            } catch {
                // The Add photo tile stays; the host can pick again.
            } finally {
                setUploading(false);
            }
        },
        [sectionId, store, upload],
    );
    const remove = useCallback(
        (photoId: string) => {
            if (sectionId) store.getState().edit(removePinnedPhoto(sectionId, photoId));
        },
        [sectionId, store],
    );
    const move = useCallback(
        (activeId: string, overId: string) => {
            if (sectionId) store.getState().edit(movePinnedPhoto(sectionId, activeId, overId));
        },
        [sectionId, store],
    );

    return { uploading, add, remove, move };
}
