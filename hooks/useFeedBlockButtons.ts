'use client';

import { useCallback, useState } from 'react';

import { addFeedBlockPhoto, colorFeedBlockText } from '@/lib/feedBlockEdits';
import type { InvitationEditorStore } from '@/lib/invitation/editorStore';
import type { ImageUploader, UploadedImage } from '@/lib/invitation/editorUploads';
import { newElementId } from '@/lib/invitation/listIds';

type FeedBlockButtonsInput = {
    store: InvitationEditorStore;
    upload: ImageUploader;
    // Edit mode's media learns the new photo at once (useFeedUploadedMedia).
    remember: (image: Pick<UploadedImage, 'mediaId' | 'url'>) => void;
    // The text fields each section shows, for the colour of fields with no style of their own.
    fieldPaths: (sectionId: string) => string[];
};

// What a Save my date block's picture and droplet do. One upload at a time; a failed upload leaves the block as it was.
export function useFeedBlockButtons({ store, upload, remember, fieldPaths }: FeedBlockButtonsInput) {
    const [uploadingId, setUploadingId] = useState<string | null>(null);
    const [failedId, setFailedId] = useState<string | null>(null);

    const addPhoto = useCallback(
        async (sectionId: string, file: File) => {
            setUploadingId(sectionId);
            setFailedId(null);
            try {
                const image = await upload(file);
                remember(image);
                store.getState().edit(addFeedBlockPhoto(sectionId, newElementId(), image.mediaId));
            } catch {
                setFailedId(sectionId);
            } finally {
                setUploadingId(null);
            }
        },
        [remember, store, upload],
    );

    const setColor = useCallback(
        (sectionId: string, color: string) => store.getState().edit(colorFeedBlockText(sectionId, color, fieldPaths(sectionId)), `block-color-${sectionId}`),
        [fieldPaths, store],
    );

    return { uploadingId, failedId, addPhoto, setColor };
}
