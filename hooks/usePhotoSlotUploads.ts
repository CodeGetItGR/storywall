'use client';

import { useCallback, useState } from 'react';

import type { InvitationEditorStore } from '@/lib/invitation/editorStore';
import { galleryHasNoRoom, type PhotoSlot, photoSlotKey, setSlotPhoto } from '@/lib/invitation/photoSlots';
import { PHOTO_COMPRESSION, photoFileProblem, type PhotoProblem, photoUploadPercent, photoUploadProblem } from '@/lib/invitation/photoUpload';
import { createPhotoUploadStore } from '@/lib/invitation/photoUploadStore';

// What the server answers for a stored photo.
export type StoredPhoto = { mediaId: string; url: string; width: number; height: number };

// Why a photo isn't on the page, and where it was meant to go.
// key: the photo slot's; null when no one slot is at fault, as with a full gallery.
export type PhotoIssue = { problem: PhotoProblem; sectionId: string | null; key: string | null };

type PhotoSlotUploadsOptions = {
    store: InvitationEditorStore;
    // Before the photo is made smaller; throws when nothing may be sent.
    prepare?: () => Promise<void>;
    // Stores the made-smaller photo.
    send: (body: FormData) => Promise<StoredPhoto>;
    // Shows a photo at once from the address the upload answered with.
    addUploaded: (mediaId: string, url: string) => void;
};

export type PhotoUploadOptions = { queued?: boolean };

// Smaller before sending; the original goes when the browser can't make it smaller.
async function compressPhoto(file: File, onProgress: (percent: number) => void): Promise<File> {
    try {
        const { default: imageCompression } = await import('browser-image-compression');
        return await imageCompression(file, { ...PHOTO_COMPRESSION, onProgress });
    } catch {
        return file;
    }
}

const slotSection = (slot: PhotoSlot) => (slot.kind === 'frame' ? null : slot.sectionId);

// A host's photo uploads into photo slots, on an invitation draft or on the feed: a file is
// checked, made smaller, sent and put in its slot as one undoable edit.
export function usePhotoSlotUploads({ store, prepare, send, addUploaded }: PhotoSlotUploadsOptions) {
    const [uploads] = useState(createPhotoUploadStore);
    const [issue, setIssue] = useState<PhotoIssue | null>(null);

    // A problem found before any upload starts, such as a full gallery; null clears the last one.
    const report = useCallback(
        (problem: PhotoProblem | null, sectionId: string | null = null) => setIssue(problem && { problem, sectionId, key: null }),
        [],
    );

    // A queued upload already waits in the list under its key (several photos picked at
    // once). It keeps the notice an earlier photo of the same pick raised.
    const upload = useCallback(
        async (slot: PhotoSlot, file: File, { queued = false }: PhotoUploadOptions = {}) => {
            const key = photoSlotKey(slot);
            const raise = (problem: PhotoProblem | null) => setIssue(problem && { problem, sectionId: slotSection(slot), key });
            if (!queued && uploads.getState().uploads[key]) return;
            const found = photoFileProblem(file);
            if (found || !queued) raise(found);
            if (found) {
                uploads.getState().clear(key);
                return;
            }

            const progress = uploads.getState().set;
            progress(key, { percent: 0 });
            try {
                await prepare?.();
                const small = await compressPhoto(file, (percent) => progress(key, { percent: photoUploadPercent('compressing', percent) }));
                progress(key, { percent: photoUploadPercent('sending', 100) });
                const body = new FormData();
                body.append('file', small, file.name);
                const saved = await send(body);
                addUploaded(saved.mediaId, saved.url);
                if (galleryHasNoRoom(store.getState().document, slot)) {
                    raise('galleryFull');
                    return;
                }
                store.getState().edit(setSlotPhoto(slot, { source: 'media', mediaId: saved.mediaId }, saved));
            } catch (error) {
                raise(photoUploadProblem(error));
            } finally {
                uploads.getState().clear(key);
            }
        },
        [addUploaded, prepare, send, store, uploads],
    );

    return { uploads, upload, report, issue };
}
