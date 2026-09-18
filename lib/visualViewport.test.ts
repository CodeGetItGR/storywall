import { describe, expect, it } from 'vitest';

import { getVisualViewportMetrics } from '@/lib/visualViewport';

describe('getVisualViewportMetrics', () => {
    it('keeps the bottom inset at zero when no typing control is focused', () => {
        expect(getVisualViewportMetrics(800, { height: 480, offsetTop: 0 }, false)).toEqual({
            height: 480,
            offsetTop: 0,
            bottomInset: 0,
            centerY: 240,
        });
    });

    it('exposes keyboard overlap while a typing control is focused', () => {
        expect(getVisualViewportMetrics(800, { height: 480, offsetTop: 20 }, true)).toEqual({
            height: 480,
            offsetTop: 20,
            bottomInset: 300,
            centerY: 260,
        });
    });

    it('ignores small browser chrome changes', () => {
        expect(getVisualViewportMetrics(800, { height: 750, offsetTop: 0 }, true).bottomInset).toBe(0);
    });
});
