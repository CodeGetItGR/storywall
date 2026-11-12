'use client';

import { type ChangeEvent, useCallback, useMemo, useRef } from 'react';
import { useStore } from 'zustand';
import { useShallow } from 'zustand/react/shallow';

import { usePhotoUploadsContext } from '@/hooks/usePhotoUploadsContext';
import { deleteGalleryPhoto, galleryPhotoIds, moveGalleryPhoto } from '@/lib/invitation/galleryEdits';
import { newSectionId } from '@/lib/invitation/newSection';
import { GALLERY_MAX_PHOTOS, galleryAddKeyPrefix, type PhotoSlot, photoSlotKey } from '@/lib/invitation/photoSlots';
import { createPhotoUploadStore, type PhotoUploadState } from '@/lib/invitation/photoUploadStore';
import type { ImageRef } from '@/lib/invitation/primitives';
import type { DocumentRecipe } from '@/lib/invitation/sectionSettings';

// Without the editor's uploads there is nothing to listen to.
const IDLE_STORE = createPhotoUploadStore();

type GalleryEditorOptions = {
    sectionId: string;
    images: readonly ImageRef[];
    edit: (recipe: DocumentRecipe) => void;
};

// The progress of the photos being added to one gallery, in the order they were picked.
function addedPercents(state: PhotoUploadState, prefix: string): number[] {
    return Object.entries(state.uploads).flatMap(([key, status]) => (key.startsWith(prefix) ? [status.percent] : []));
}

// One gallery's photos in the editor (old gallery panel): add several at once, up to
// 10, replace, delete and reorder. Each change is one undo step.
export function useGalleryEditor({ sectionId, images, edit }: GalleryEditorOptions) {
    const slots = usePhotoUploadsContext();
    const uploads = slots?.uploads ?? IDLE_STORE;
    const inputRef = useRef<HTMLInputElement>(null);
    const prefix = galleryAddKeyPrefix(sectionId);
    const ids = useMemo(() => galleryPhotoIds(images), [images]);

    const adding = useStore(
        uploads,
        useShallow((state) => addedPercents(state, prefix)),
    );
    const replacing = useStore(
        uploads,
        useShallow((state) =>
            images.map((photo, index) => state.uploads[photoSlotKey({ kind: 'gallery', sectionId, index, photo })]?.percent ?? null),
        ),
    );
    const room = GALLERY_MAX_PHOTOS - images.length - adding.length;

    // Opens the file picker, or the sign-in pop-up for a visitor.
    const pick = useCallback(() => {
        if (!slots) return;
        if (room <= 0) {
            slots.report('galleryFull');
            return;
        }
        if (slots.canPick()) inputRef.current?.click();
    }, [room, slots]);

    // Sends the picked photos one after another, so they land in the order picked.
    // Each waits in the list from the start, so the room left stays true meanwhile.
    const addFiles = useCallback(
        async (files: readonly File[]) => {
            if (!slots || files.length === 0) return;
            const left = GALLERY_MAX_PHOTOS - images.length - addedPercents(uploads.getState(), prefix).length;
            if (files.length > left) slots.report('galleryFull');
            const queued = files
                .slice(0, Math.max(0, left))
                .map((file) => ({ file, slot: { kind: 'galleryAdd', sectionId, id: newSectionId() } as PhotoSlot }));
            for (const { slot } of queued) uploads.getState().set(photoSlotKey(slot), { percent: 0 });
            for (const { file, slot } of queued) {
                uploads.getState().clear(photoSlotKey(slot));
                await slots.upload(slot, file);
            }
        },
        [images.length, prefix, sectionId, slots, uploads],
    );

    const onFiles = useCallback(
        (event: ChangeEvent<HTMLInputElement>) => {
            const files = Array.from(event.target.files ?? []);
            // The same files can be picked again after a failure.
            event.target.value = '';
            void addFiles(files);
        },
        [addFiles],
    );

    const replace = useCallback(
        (index: number, file: File) => {
            const photo = images[index];
            if (slots && photo) void slots.upload({ kind: 'gallery', sectionId, index, photo }, file);
        },
        [images, sectionId, slots],
    );

    const remove = useCallback((index: number) => edit(deleteGalleryPhoto(sectionId, index)), [edit, sectionId]);

    const reorder = useCallback(
        (activeId: string, overId: string) => {
            const from = ids.indexOf(activeId);
            const to = ids.indexOf(overId);
            if (from >= 0 && to >= 0) edit(moveGalleryPhoto(sectionId, from, to));
        },
        [edit, ids, sectionId],
    );

    return {
        isAvailable: slots !== null,
        ids,
        count: images.length,
        adding,
        replacing,
        canAdd: room > 0,
        inputRef,
        pick,
        onFiles,
        addFiles,
        canPick: slots?.canPick,
        replace,
        remove,
        reorder,
    };
}

export type GalleryEditor = ReturnType<typeof useGalleryEditor>;
