import { produce } from 'immer';
import { describe, expect, it } from 'vitest';

import type { PhotoFrameElement } from '@/lib/invitation/photoFrame';
import {
    clampFrameZoom,
    draggedBandPosition,
    isFrameAnimation,
    pannedPosition,
    setFrameAnimation,
    setFrameId,
    setFramePosition,
    setFrameZoom,
    setPhotoBandPosition,
    steppedPercent,
} from '@/lib/invitation/photoFrameEdits';
import { SAMPLE_DOCUMENT } from '@/lib/invitation/samples';

const frameOf = (document: typeof SAMPLE_DOCUMENT) =>
    document.sections.flatMap((section) => section.elements).find((element) => element.kind === 'photoFrame') as PhotoFrameElement;
const bandOf = (document: typeof SAMPLE_DOCUMENT) => {
    const band = document.sections.find((section) => section.type === 'photo');
    return band?.type === 'photo' ? band.data.imageY : null;
};
const FRAME_ID = frameOf(SAMPLE_DOCUMENT).id;
const BAND_ID = SAMPLE_DOCUMENT.sections.find((section) => section.type === 'photo')!.id;

describe('pannedPosition', () => {
    it('follows the pointer, a full edge to edge over 60% of the box', () => {
        expect(pannedPosition({ imageX: 50, imageY: 50 }, { x: 60, y: -30 }, { width: 200, height: 100 })).toEqual({ imageX: 100, imageY: 0 });
        expect(pannedPosition({ imageX: 50, imageY: 50 }, { x: 12, y: 0 }, { width: 200, height: 100 })).toEqual({ imageX: 60, imageY: 50 });
    });

    it('measures a tiny box as 60px across', () => {
        expect(pannedPosition({ imageX: 50, imageY: 50 }, { x: 6, y: 6 }, { width: 0, height: 0 })).toEqual({ imageX: 60, imageY: 60 });
    });
});

describe('draggedBandPosition', () => {
    it('shows more of the top when dragged down, within 0 to 100', () => {
        expect(draggedBandPosition(50, 60, 500)).toBe(30);
        expect(draggedBandPosition(50, -1000, 500)).toBe(100);
    });
});

describe('clampFrameZoom and steppedPercent', () => {
    it('keeps the zoom between 1x and 3x, to two decimals', () => {
        expect(clampFrameZoom(0.5)).toBe(1);
        expect(clampFrameZoom(1.151)).toBe(1.15);
        expect(clampFrameZoom(4)).toBe(3);
    });

    it('keeps a position between 0 and 100', () => {
        expect(steppedPercent(98, 5)).toBe(100);
        expect(steppedPercent(3, -5)).toBe(0);
    });
});

describe('frame edits', () => {
    it('sets the photo position and zoom of one frame', () => {
        const next = produce(SAMPLE_DOCUMENT, (draft) => {
            setFramePosition(draft, FRAME_ID, { imageX: 120, imageY: 20 });
            setFrameZoom(draft, FRAME_ID, 9);
        });
        expect(frameOf(next)).toMatchObject({ imageX: 100, imageY: 20, zoom: 3 });
    });

    it('sets the frame and its effect', () => {
        const next = produce(SAMPLE_DOCUMENT, (draft) => {
            setFrameId(draft, FRAME_ID, '');
            setFrameAnimation(draft, FRAME_ID, 'float');
        });
        expect(frameOf(next)).toMatchObject({ frameId: '', animation: 'float' });
    });

    it('leaves the document alone for a frame that is gone', () => {
        const next = produce(SAMPLE_DOCUMENT, (draft) => setFrameZoom(draft, 'gone', 2));
        expect(next).toBe(SAMPLE_DOCUMENT);
    });

    it('moves the photo band', () => {
        const next = produce(SAMPLE_DOCUMENT, (draft) => setPhotoBandPosition(draft, BAND_ID, 70));
        expect(bandOf(next)).toBe(70);
    });

    it('knows the frame effects', () => {
        expect(isFrameAnimation('pop-elegant')).toBe(true);
        expect(isFrameAnimation('spin')).toBe(false);
    });
});
