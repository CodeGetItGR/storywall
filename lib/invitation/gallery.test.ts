import { describe, expect, it } from 'vitest';

import {
    galleryDotLabel,
    galleryGridClass,
    galleryImages,
    galleryPhotoAlt,
    isEmptyForGuests,
    stepGalleryIndex,
} from '@/lib/invitation/gallery';
import { INVITATION_LABELS } from '@/lib/invitation/labels';
import { buildRenderContext } from '@/lib/invitation/render';
import { SAMPLE_DOCUMENT, SAMPLE_SECTIONS, SAMPLE_THEME } from '@/lib/invitation/samples';

const FILES: Record<string, string> = { 'm-1': '/one.png', 'm-2': '/two.png', 'm-photo': '/photo.png' };
const ctx = buildRenderContext(SAMPLE_DOCUMENT, SAMPLE_THEME, (mediaId) => FILES[mediaId]);
const gallery = SAMPLE_SECTIONS.gallery;
const photo = SAMPLE_SECTIONS.photo;

describe('galleryImages', () => {
    it('numbers the photos in the invitation language', () => {
        expect(galleryImages(gallery.data, ctx)).toEqual([
            { src: '/one.png', alt: 'Φωτογραφία 1 από 2' },
            { src: '/two.png', alt: 'Φωτογραφία 2 από 2' },
        ]);
    });

    it('leaves out a photo whose file is gone and counts only the rest', () => {
        const data = { ...gallery.data, images: [{ source: 'media' as const, mediaId: 'gone' }, ...gallery.data.images] };

        expect(galleryImages(data, ctx).map((image) => image.alt)).toEqual(['Φωτογραφία 1 από 2', 'Φωτογραφία 2 από 2']);
    });
});

describe('labels', () => {
    it('fills in the photo numbers in both languages', () => {
        expect(galleryPhotoAlt(1, 7, INVITATION_LABELS.el)).toBe('Φωτογραφία 1 από 7');
        expect(galleryPhotoAlt(1, 7, INVITATION_LABELS.en)).toBe('Photo 1 of 7');
        expect(galleryDotLabel(3, INVITATION_LABELS.el)).toBe('Φωτογραφία 3');
        expect(galleryDotLabel(3, INVITATION_LABELS.en)).toBe('Photo 3');
    });
});

describe('stepGalleryIndex', () => {
    it('moves one photo at a time', () => {
        expect(stepGalleryIndex(1, 1, 4)).toBe(2);
        expect(stepGalleryIndex(1, -1, 4)).toBe(0);
    });

    it('goes round at both ends', () => {
        expect(stepGalleryIndex(3, 1, 4)).toBe(0);
        expect(stepGalleryIndex(0, -1, 4)).toBe(3);
    });

    it('stays put with no photos', () => {
        expect(stepGalleryIndex(0, 1, 0)).toBe(0);
    });
});

describe('isEmptyForGuests', () => {
    it('keeps a gallery with a photo that loads', () => {
        expect(isEmptyForGuests(gallery, ctx)).toBe(false);
    });

    it('hides a gallery with no photos, even with its own texts', () => {
        const elements = [{ id: 'text', kind: 'text' as const, role: 'paragraph' as const, text: 'Κείμενο', style: {} }];

        expect(isEmptyForGuests({ ...gallery, elements, data: { ...gallery.data, images: [] } }, ctx)).toBe(true);
    });

    it('hides a gallery whose files are all gone', () => {
        const images = [{ source: 'media' as const, mediaId: 'gone' }];

        expect(isEmptyForGuests({ ...gallery, data: { ...gallery.data, images } }, ctx)).toBe(true);
    });

    it('keeps an empty photo section in the editor, which shows its camera', () => {
        const editing = { ...ctx, canvasTools: { photo: () => null } };

        expect(isEmptyForGuests({ ...photo, data: { imageY: 50 } }, editing)).toBe(false);
    });

    describe('a frame section', () => {
        const section = SAMPLE_SECTIONS.photoFrame;
        const withFrame = (frameId: string) => ({
            ...section,
            elements: section.elements.map((element) => (element.kind === 'photoFrame' ? { ...element, frameId, photo: undefined } : element)),
        });
        // The frame's art and mask load; its photo is gone.
        const framed = buildRenderContext(SAMPLE_DOCUMENT, SAMPLE_THEME, (mediaId) => (mediaId.startsWith('m-frame') ? `/${mediaId}.png` : undefined));
        const host = { ...framed, canvasTools: { photo: () => null } };
        const admin = { ...host, canvasTools: { ...host.canvasTools, frameSettings: () => null } };

        it('is hidden for guests with no photo in its frame', () => {
            expect(isEmptyForGuests(withFrame('fr-oval'), framed)).toBe(true);
        });

        it('shows its empty frame in the editor', () => {
            expect(isEmptyForGuests(withFrame('fr-oval'), host)).toBe(false);
        });

        it('with no frame chosen is hidden for hosts but kept for admins', () => {
            expect(isEmptyForGuests(withFrame(''), host)).toBe(true);
            expect(isEmptyForGuests(withFrame(''), admin)).toBe(false);
        });
    });

    it('keeps a photo section with a photo', () => {
        expect(isEmptyForGuests(photo, ctx)).toBe(false);
    });

    it('hides a photo section with no photo or a missing file', () => {
        expect(isEmptyForGuests({ ...photo, data: { imageY: 50 } }, ctx)).toBe(true);
        expect(isEmptyForGuests({ ...photo, data: { imageY: 50, photo: { source: 'media', mediaId: 'gone' } } }, ctx)).toBe(true);
    });

    it('never hides another section type', () => {
        expect(isEmptyForGuests(SAMPLE_SECTIONS.faq, ctx)).toBe(false);
    });
});

describe('galleryGridClass', () => {
    it('names a grid class for every layout with cells', () => {
        expect(galleryGridClass('grid')).toBe('wedart-gallery-grid');
        expect(galleryGridClass('masonry')).toBe('wedart-gallery-masonry');
        expect(galleryGridClass('featured')).toBe('wedart-gallery-featured');
    });
});
