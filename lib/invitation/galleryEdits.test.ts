import { produce } from 'immer';
import { describe, expect, it } from 'vitest';

import type { InvitationDocument } from '@/lib/invitation/document';
import {
    deleteGalleryPhoto,
    galleryHasShape,
    moveGalleryPhoto,
    setGalleryLayout,
    setGalleryShape,
} from '@/lib/invitation/galleryEdits';
import { GALLERY_MAX_PHOTOS, galleryHasNoRoom, galleryPhotoIds, photoSlotKey, setSlotPhoto } from '@/lib/invitation/photoSlots';
import type { ImageRef } from '@/lib/invitation/primitives';
import { SAMPLE_DOCUMENT, SAMPLE_SECTIONS } from '@/lib/invitation/samples';

const photo = (mediaId: string): ImageRef => ({ source: 'media', mediaId });
const ID = SAMPLE_SECTIONS.gallery.id;
const SIZE = { width: 800, height: 600 };

function withImages(images: ImageRef[]): InvitationDocument {
    return { ...SAMPLE_DOCUMENT, sections: [{ ...SAMPLE_SECTIONS.gallery, data: { ...SAMPLE_SECTIONS.gallery.data, images } }] };
}

function galleryOf(document: InvitationDocument) {
    const section = document.sections[0];
    if (section.type !== 'gallery') throw new Error('no gallery');
    return section.data;
}

const mediaIds = (document: InvitationDocument) =>
    galleryOf(document).images.map((image) => (image.source === 'media' ? image.mediaId : image.assetId));

describe('galleryPhotoIds', () => {
    it('gives each photo a steady id, a photo there twice included', () => {
        expect(galleryPhotoIds([photo('a'), { source: 'theme', assetId: 't' }, photo('a')])).toEqual(['media:a#0', 'theme:t#0', 'media:a#1']);
    });
});

describe('gallery edits', () => {
    const document = withImages([photo('a'), photo('b'), photo('c')]);

    it('deletes one photo, and leaves a place that is gone alone', () => {
        expect(mediaIds(produce(document, deleteGalleryPhoto(ID, 1)))).toEqual(['a', 'c']);
        expect(produce(document, deleteGalleryPhoto(ID, 5))).toBe(document);
    });

    it('moves a photo to another place', () => {
        expect(mediaIds(produce(document, moveGalleryPhoto(ID, 0, 2)))).toEqual(['b', 'c', 'a']);
        expect(produce(document, moveGalleryPhoto(ID, 0, 9))).toBe(document);
    });

    it('sets the layout and the shape', () => {
        const next = produce(document, (draft) => {
            setGalleryLayout(ID, 'carousel')(draft);
            setGalleryShape(ID, 'round')(draft);
        });
        expect(galleryOf(next)).toMatchObject({ layout: 'carousel', shape: 'round' });
    });

    it('offers a shape for the grid and one large photo only', () => {
        expect(galleryHasShape('grid')).toBe(true);
        expect(galleryHasShape('featured')).toBe(true);
        expect(galleryHasShape('masonry')).toBe(false);
        expect(galleryHasShape('carousel')).toBe(false);
    });
});

describe('gallery photo slots', () => {
    it('adds an uploaded photo at the end, up to 10', () => {
        const slot = { kind: 'galleryAdd', sectionId: ID, id: 'u-1' } as const;
        expect(photoSlotKey(slot)).toBe(`gallery-add:${ID}:u-1`);
        expect(mediaIds(produce(withImages([photo('a')]), setSlotPhoto(slot, photo('new'), SIZE)))).toEqual(['a', 'new']);

        const full = withImages(Array.from({ length: GALLERY_MAX_PHOTOS }, (_, index) => photo(`p${index}`)));
        expect(produce(full, setSlotPhoto(slot, photo('new'), SIZE))).toBe(full);
    });

    it('replaces the photo it was opened on, wherever it moved meanwhile', () => {
        const slot = { kind: 'gallery', sectionId: ID, photoId: 'media:a#0', photo: photo('a') } as const;
        expect(photoSlotKey(slot)).toBe(`gallery:${ID}:media:a#0`);
        expect(mediaIds(produce(withImages([photo('a'), photo('b')]), setSlotPhoto(slot, photo('new'), SIZE)))).toEqual(['new', 'b']);
        expect(mediaIds(produce(withImages([photo('b'), photo('a')]), setSlotPhoto(slot, photo('new'), SIZE)))).toEqual(['b', 'new']);
    });

    it('replaces the one copy it was opened on, where a photo is there twice', () => {
        const slot = { kind: 'gallery', sectionId: ID, photoId: 'media:a#1', photo: photo('a') } as const;
        expect(mediaIds(produce(withImages([photo('a'), photo('b'), photo('a')]), setSlotPhoto(slot, photo('new'), SIZE)))).toEqual(['a', 'b', 'new']);
    });

    it('drops a replacement whose photo was deleted meanwhile', () => {
        const slot = { kind: 'gallery', sectionId: ID, photoId: 'media:a#0', photo: photo('a') } as const;
        const gone = withImages([photo('b')]);
        expect(galleryHasNoRoom(gone, slot)).toBe(false);
        expect(produce(gone, setSlotPhoto(slot, photo('new'), SIZE))).toBe(gone);
    });

    it('knows when an added photo has no room left', () => {
        const full = withImages(Array.from({ length: GALLERY_MAX_PHOTOS }, (_, index) => photo(`p${index}`)));
        expect(galleryHasNoRoom(full, { kind: 'galleryAdd', sectionId: ID, id: 'u-1' })).toBe(true);
        // A replacement needs no room: it takes its photo's place, or is dropped with it.
        expect(galleryHasNoRoom(full, { kind: 'gallery', sectionId: ID, photoId: 'media:a#0', photo: photo('a') })).toBe(false);
        expect(galleryHasNoRoom(full, { kind: 'gallery', sectionId: ID, photoId: 'media:p3#0', photo: photo('p3') })).toBe(false);
        expect(galleryHasNoRoom(full, { kind: 'frame', elementId: 'e-1' })).toBe(false);
    });
});
