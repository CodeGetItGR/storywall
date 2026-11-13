import { produce } from 'immer';
import { describe, expect, it } from 'vitest';

import type { InvitationDocument } from '@/lib/invitation/document';
import {
    deleteGalleryPhoto,
    galleryHasShape,
    galleryPhotoIds,
    moveGalleryPhoto,
    setGalleryLayout,
    setGalleryShape,
} from '@/lib/invitation/galleryEdits';
import { GALLERY_MAX_PHOTOS, photoSlotKey, setSlotPhoto } from '@/lib/invitation/photoSlots';
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
        const slot = { kind: 'gallery', sectionId: ID, index: 0, photo: photo('a') } as const;
        expect(mediaIds(produce(withImages([photo('a'), photo('b')]), setSlotPhoto(slot, photo('new'), SIZE)))).toEqual(['new', 'b']);
        expect(mediaIds(produce(withImages([photo('b'), photo('a')]), setSlotPhoto(slot, photo('new'), SIZE)))).toEqual(['b', 'new']);

        const gone = withImages([photo('b')]);
        expect(produce(gone, setSlotPhoto(slot, photo('new'), SIZE))).toBe(gone);
    });
});
