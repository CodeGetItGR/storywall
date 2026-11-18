import { describe, expect, it } from 'vitest';

import { isEmptyForGuests } from '@/lib/invitation/gallery';
import { type PhotoFrameElement, photoFrameGeometry, photoFrameWidth, resolvePhotoFrame } from '@/lib/invitation/photoFrame';
import { buildRenderContext } from '@/lib/invitation/render';
import { SAMPLE_DOCUMENT, SAMPLE_SECTIONS, SAMPLE_THEME } from '@/lib/invitation/samples';

const FILES: Record<string, string> = { 'm-framed': '/photo.png', 'm-frame-art': '/art.png', 'm-frame-mask': '/mask.png' };
const ctx = buildRenderContext(SAMPLE_DOCUMENT, SAMPLE_THEME, (mediaId) => FILES[mediaId]);
const section = SAMPLE_SECTIONS.photoFrame;
const element = section.elements[0] as PhotoFrameElement;
const BOX = { width: 900, height: 1200 };

describe('photoFrameGeometry', () => {
    it('scales a wide photo to cover a tall frame, centred', () => {
        // 1200x800 needs a scale of 1.5 to reach the height of 1200.
        expect(photoFrameGeometry(element, BOX)).toEqual({ x: -450, y: 0, width: 1800, height: 1200, preserveAspectRatio: 'none' });
    });

    it('moves the photo within what overflows', () => {
        expect(photoFrameGeometry({ ...element, imageX: 0 }, BOX).x).toBe(-900 + 900 / 2 - 450);
        expect(photoFrameGeometry({ ...element, imageX: 100 }, BOX).x).toBe(0);
    });

    it('leaves the axis with no overflow alone', () => {
        expect(photoFrameGeometry({ ...element, imageY: 0 }, BOX).y).toBe(0);
        expect(photoFrameGeometry({ ...element, imageY: 100 }, BOX).y).toBe(0);
    });

    it('applies the saved zoom', () => {
        const geometry = photoFrameGeometry({ ...element, zoom: 2 }, BOX);

        expect(geometry.width).toBe(3600);
        expect(geometry.height).toBe(2400);
        expect(geometry.y).toBe(-600);
    });

    it('never zooms below covering the frame', () => {
        expect(photoFrameGeometry({ ...element, zoom: 0.5 }, BOX).width).toBe(1800);
    });

    it('fills the frame without stretching when the photo size is not saved', () => {
        expect(photoFrameGeometry({ ...element, imageWidth: 0, imageHeight: 0 }, BOX)).toEqual({
            x: 0,
            y: 0,
            width: 900,
            height: 1200,
            preserveAspectRatio: 'xMidYMid slice',
        });
    });
});

describe('photoFrameWidth', () => {
    it('scales from 420px and never passes the available width', () => {
        expect(photoFrameWidth(1)).toBe('min(420px, 100%)');
        expect(photoFrameWidth(0.625)).toBe('min(263px, 100%)');
    });
});

describe('resolvePhotoFrame', () => {
    it('gathers the frame and its files', () => {
        expect(resolvePhotoFrame(element, ctx)).toEqual({
            name: 'Οβάλ',
            width: 900,
            height: 1200,
            photo: '/photo.png',
            art: '/art.png',
            mask: '/mask.png',
        });
    });

    it('resolves to nothing with no frame chosen', () => {
        expect(resolvePhotoFrame({ ...element, frameId: '' }, ctx)).toBeNull();
    });

    it('resolves to nothing with no photo', () => {
        expect(resolvePhotoFrame({ ...element, photo: undefined }, ctx)).toBeNull();
    });

    it('resolves to nothing when the art or mask file is gone', () => {
        const noFiles = buildRenderContext(SAMPLE_DOCUMENT, SAMPLE_THEME, (mediaId) => (mediaId === 'm-framed' ? '/photo.png' : undefined));

        expect(resolvePhotoFrame(element, noFiles)).toBeNull();
    });
});

describe('isEmptyForGuests, frame sections', () => {
    const text = { id: 'text', kind: 'text' as const, role: 'paragraph' as const, text: 'Κείμενο', style: {} };

    it('keeps a section with a frame to show', () => {
        expect(isEmptyForGuests(section, ctx)).toBe(false);
    });

    it('hides a section whose only frame has nothing to show', () => {
        expect(isEmptyForGuests({ ...section, elements: [{ ...element, frameId: '' }] }, ctx)).toBe(true);
    });

    it('hides a custom section whose only frame has nothing to show', () => {
        expect(isEmptyForGuests({ ...SAMPLE_SECTIONS.blank, elements: [{ ...element, photo: undefined }] }, ctx)).toBe(true);
    });

    it('keeps a section with its own content when its only frame is empty', () => {
        expect(isEmptyForGuests({ ...SAMPLE_SECTIONS.top, elements: [{ ...element, frameId: '' }] }, ctx)).toBe(false);
    });

    it('keeps a section with text beside an empty frame', () => {
        expect(isEmptyForGuests({ ...section, elements: [{ ...element, frameId: '' }, text] }, ctx)).toBe(false);
    });

    it('keeps a section with no elements, a plain band on the old page too', () => {
        expect(isEmptyForGuests({ ...section, elements: [] }, ctx)).toBe(false);
    });
});
