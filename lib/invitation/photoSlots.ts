import type { ImageRef } from '@/lib/invitation/primitives';
import { resolveTextField, type SectionType } from '@/lib/invitation/sections';
import type { DocumentRecipe } from '@/lib/invitation/sectionSettings';

// A place in the document that holds one photo the host can upload or replace
// (old media-runtime.js: the photo section, the family and couple photos and
// the photo frames). A field path reads like a text path: a list segment is an
// item's id, so `godparents.<id>.photo` follows the godparent when it moves.
// Element ids are unique in the whole invitation, so a frame is found by its id alone.
export type PhotoSlot = { kind: 'field'; sectionId: string; path: string } | { kind: 'frame'; elementId: string };

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
    return slot.kind === 'field' ? `field:${slot.sectionId}:${slot.path}` : `frame:${slot.elementId}`;
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
        if (!section || !isPhotoField(section.type, slot.path)) return;
        const segments = slot.path.split('.');
        const name = segments.pop() as string;
        const parent = segments.length ? resolveTextField(section.data, segments.join('.')) : section.data;
        if (isRecord(parent)) parent[name] = photo;
    };
}
