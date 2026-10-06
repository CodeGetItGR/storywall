import { describe, expect, it } from 'vitest';

import { getPinchZoomBox, getVisualViewportMetrics } from '@/lib/visualViewport';

describe('getVisualViewportMetrics', () => {
    it('keeps the bottom inset at zero when no typing control is focused', () => {
        expect(getVisualViewportMetrics(800, { height: 480, offsetTop: 0, scale: 1 }, false)).toEqual({
            height: 480,
            pageHeight: 480,
            offsetTop: 0,
            bottomInset: 0,
            centerY: 240,
        });
    });

    it('exposes keyboard overlap while a typing control is focused', () => {
        expect(getVisualViewportMetrics(800, { height: 480, offsetTop: 20, scale: 1 }, true)).toEqual({
            height: 480,
            pageHeight: 480,
            offsetTop: 20,
            bottomInset: 300,
            centerY: 260,
        });
    });

    it('ignores small browser chrome changes', () => {
        expect(getVisualViewportMetrics(800, { height: 750, offsetTop: 0, scale: 1 }, true).bottomInset).toBe(0);
    });

    it('keeps the page height at the unzoomed visible height during a pinch zoom', () => {
        expect(getVisualViewportMetrics(800, { height: 400, offsetTop: 200, scale: 2 }, false).pageHeight).toBe(800);
    });
});

describe('getPinchZoomBox', () => {
    it('is null when the page is not zoomed', () => {
        expect(getPinchZoomBox({ scale: 1, width: 390, height: 800, offsetLeft: 0, offsetTop: 0 })).toBeNull();
    });

    it('covers the visible area at its unzoomed size', () => {
        expect(getPinchZoomBox({ scale: 2, width: 195, height: 400, offsetLeft: 50, offsetTop: 120 })).toEqual({
            width: 390,
            height: 800,
            transform: 'translate(50px, 120px) scale(0.5)',
        });
    });
});
