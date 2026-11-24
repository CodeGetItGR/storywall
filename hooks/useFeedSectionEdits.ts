'use client';

import { useCallback, useState } from 'react';

import { addFeedBlockPhoto, colorFeedBlockText } from '@/lib/feedBlockEdits';
import { setSectionColor, setSectionPhoto } from '@/lib/feedSectionBackground';
import type { InvitationEditorStore } from '@/lib/invitation/editorStore';
import type { ImageUploader, UploadedImage } from '@/lib/invitation/editorUploads';
import { newElementId } from '@/lib/invitation/listIds';
import { settingMergeKey } from '@/lib/invitation/sectionSettings';

export type FeedPhotoPlace = 'content' | 'background';
export type FeedFailedPhoto = { id: string; place: FeedPhotoPlace };

type FeedSectionEditsInput = {
    store: InvitationEditorStore;
    upload: ImageUploader;
    // Edit mode's media learns the new photo at once (useFeedUploadedMedia).
    remember: (image: Pick<UploadedImage, 'mediaId' | 'url'>) => void;
    // The text fields each section shows, for the colour of fields with no style of their own.
    fieldPaths: (sectionId: string) => string[];
};

// What the host does to a Save my date section as a whole: a photo in it, one colour for its text, and its own
// background. One upload at a time; a failed one leaves the section as it was. Changing colours is one undo step.
export function useFeedSectionEdits({ store, upload, remember, fieldPaths }: FeedSectionEditsInput) {
    const [uploadingId, setUploadingId] = useState<string | null>(null);
    const [failed, setFailed] = useState<FeedFailedPhoto | null>(null);

    const uploadFor = useCallback(
        async (sectionId: string, place: FeedPhotoPlace, file: File, put: (mediaId: string) => void) => {
            setUploadingId(sectionId);
            setFailed(null);
            try {
                const image = await upload(file);
                remember(image);
                put(image.mediaId);
                return true;
            } catch {
                setFailed({ id: sectionId, place });
                return false;
            } finally {
                setUploadingId((current) => (current === sectionId ? null : current));
            }
        },
        [remember, upload],
    );

    const addPhoto = useCallback(
        (sectionId: string, file: File) =>
            uploadFor(sectionId, 'content', file, (mediaId) => store.getState().edit(addFeedBlockPhoto(sectionId, newElementId(), mediaId))),
        [store, uploadFor],
    );
    const setBackgroundPhoto = useCallback(
        (sectionId: string, file: File) =>
            uploadFor(sectionId, 'background', file, (mediaId) => store.getState().edit(setSectionPhoto(sectionId, mediaId))),
        [store, uploadFor],
    );
    const removeBackgroundPhoto = useCallback((sectionId: string) => store.getState().edit(setSectionPhoto(sectionId, undefined)), [store]);
    const setBackgroundColor = useCallback(
        (sectionId: string, color: string | undefined) =>
            store.getState().edit(setSectionColor(sectionId, color), color === undefined ? undefined : settingMergeKey(sectionId, 'background')),
        [store],
    );
    const setTextColor = useCallback(
        (sectionId: string, color: string) => store.getState().edit(colorFeedBlockText(sectionId, color, fieldPaths(sectionId)), `block-color-${sectionId}`),
        [fieldPaths, store],
    );

    return { uploadingId, failed, addPhoto, setTextColor, setBackgroundPhoto, removeBackgroundPhoto, setBackgroundColor };
}
