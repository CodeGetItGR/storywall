import type { ImageRef } from '@/lib/invitation/primitives';
import { resolveTextField, type SectionType } from '@/lib/invitation/sections';
import type { DocumentRecipe } from '@/lib/invitation/sectionSettings';

// A place in the document that holds one photo the host can upload or replace
// (old media-runtime.js: the photo section, the family and couple photos and
// the photo frames). A field path reads like a text path: a list segment is an
// item's id, so `godparents.<id>.photo` follows the godparent when it moves.
// Element ids are unique in the whole invitation, so a frame is found by its id alone.
// A gallery photo has no id of its own: replacing one finds it by the photo it held,
// and each added photo gets an upload id of its own.
export type PhotoSlot =
    | { kind: 'field'; sectionId: string; path: string }
    | { kind: 'frame'; elementId: string }
    | { kind: 'gallery'; sectionId: string; index: number; photo: ImageRef }
    | { kind: 'galleryAdd'; sectionId: string; id: string };

// A gallery holds at most 10 photos.
export const GALLERY_MAX_PHOTOS = 10;

// The size of the stored file, which frames use to fit the photo without stretching it.
export type PhotoSize = { width: number; height: number };

// The photo fields of each section type. A `*` is one item of the list before it.
const PHOTO_FIELDS: Partial<Record<SectionType, readonly string[]>> = {
    photo: ['photo'],
    baby: ['babyPhoto'],
    parentsPhoto: ['parentA.photo', 'parentB.photo'],
    godparents: ['godparents.*.photo'],
    weddingSponsors: ['sponsors.*.photo'],
    coupleProfiles: ['partnerA.photo', 'partnerB.photo'],
};

export function isPhotoField(type: SectionType, path: string): boolean {
    const segments = path.split('.');
    return (PHOTO_FIELDS[type] ?? []).some((pattern) => {
        const parts = pattern.split('.');
        return parts.length === segments.length && parts.every((part, index) => part === '*' || part === segments[index]);
    });
}

export function photoFieldSlot(sectionId: string, path: string): PhotoSlot {
    return { kind: 'field', sectionId, path };
}

export function photoFrameSlot(elementId: string): PhotoSlot {
    return { kind: 'frame', elementId };
}

// One key per slot, for its upload state.
export function photoSlotKey(slot: PhotoSlot): string {
    switch (slot.kind) {
        case 'field':
            return `field:${slot.sectionId}:${slot.path}`;
        case 'frame':
            return `frame:${slot.elementId}`;
        case 'gallery':
            return `gallery:${slot.sectionId}:${slot.index}`;
        case 'galleryAdd':
            return galleryAddKeyPrefix(slot.sectionId) + slot.id;
    }
}

// The start of the keys of one gallery's added photos, to count the ones still uploading.
export function galleryAddKeyPrefix(sectionId: string): string {
    return `gallery-add:${sectionId}:`;
}

// One photo as text: where it comes from and its id.
export function imageKey(image: ImageRef): string {
    return `${image.source}:${'mediaId' in image ? image.mediaId : image.assetId}`;
}

export function sameImage(a: ImageRef, b: ImageRef): boolean {
    return imageKey(a) === imageKey(b);
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

// Puts an uploaded photo in its slot. A slot that is gone by the time the upload
// answers (deleted, or undone away) is left alone, as the old editor did. A frame
// keeps the host's crop and learns the new photo's size.
export function setSlotPhoto(slot: PhotoSlot, photo: ImageRef, size: PhotoSize): DocumentRecipe {
    return (draft) => {
        if (slot.kind === 'frame') {
            const element = draft.sections.flatMap((section) => section.elements).find((item) => item.id === slot.elementId);
            if (element?.kind !== 'photoFrame') return;
            element.photo = photo;
            element.imageWidth = size.width;
            element.imageHeight = size.height;
            return;
        }

        const section = draft.sections.find((item) => item.id === slot.sectionId);
        if (slot.kind !== 'field') {
            if (section?.type !== 'gallery') return;
            const { images } = section.data;
            if (slot.kind === 'galleryAdd') {
                if (images.length < GALLERY_MAX_PHOTOS) images.push(photo);
                return;
            }
            // Where the photo was, or where it moved to meanwhile.
            const at = images[slot.index] && sameImage(images[slot.index], slot.photo) ? slot.index : images.findIndex((item) => sameImage(item, slot.photo));
            if (at >= 0) images[at] = photo;
            return;
        }
        if (!section || !isPhotoField(section.type, slot.path)) return;
        const segments = slot.path.split('.');
        const name = segments.pop() as string;
        const parent = segments.length ? resolveTextField(section.data, segments.join('.')) : section.data;
        if (isRecord(parent)) parent[name] = photo;
    };
}
