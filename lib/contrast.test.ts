import { describe, expect, it } from 'vitest';

import {
    contrastRatio,
    INK_COLOR,
    lightTone,
    luminanceContrast,
    MIN_INK_CONTRAST,
    mixColors,
    relativeLuminance,
    tooDarkForInk,
} from '@/lib/contrast';

describe('relativeLuminance', () => {
    it('is 0 for black and 1 for white', () => {
        expect(relativeLuminance('#000000')).toBe(0);
        expect(relativeLuminance('#FFFFFF')).toBeCloseTo(1, 10);
    });

    it('weights green above red above blue', () => {
        expect(relativeLuminance('#00FF00')).toBeCloseTo(0.7152, 4);
        expect(relativeLuminance('#FF0000')).toBeCloseTo(0.2126, 4);
        expect(relativeLuminance('#0000FF')).toBeCloseTo(0.0722, 4);
    });

    it('accepts lower-case hex', () => {
        expect(relativeLuminance('#bfe6e2')).toBe(relativeLuminance('#BFE6E2'));
    });
});

describe('contrastRatio', () => {
    it('is 21 for black on white, in either order', () => {
        expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 5);
        expect(contrastRatio('#FFFFFF', '#000000')).toBeCloseTo(21, 5);
    });

    it('is 1 for a colour against itself', () => {
        expect(contrastRatio('#5A256F', '#5A256F')).toBe(1);
    });

    it('puts #5A256F on #1E93A7 a hair under 3, as the server computes it', () => {
        const ratio = contrastRatio('#5A256F', '#1E93A7');
        expect(ratio).toBeLessThan(3);
        expect(ratio).toBeGreaterThan(2.99);
    });
});

describe('tooDarkForInk', () => {
    it('is true only when ink text cannot be read on the colour', () => {
        expect(tooDarkForInk('#F5E6D3')).toBe(false);
        expect(tooDarkForInk('#FFFFFF')).toBe(false);
        expect(tooDarkForInk('#000000')).toBe(true);
        expect(tooDarkForInk('#1B2A4A')).toBe(true);
    });

    it('is true when ink reads but the muted ink labels do not', () => {
        expect(contrastRatio('#8D8DA0', INK_COLOR)).toBeGreaterThanOrEqual(MIN_INK_CONTRAST);
        expect(tooDarkForInk('#8D8DA0')).toBe(true);
    });
});

describe('luminanceContrast', () => {
    it('is what contrastRatio works out from the colours', () => {
        expect(luminanceContrast(relativeLuminance('#1B2A4A'), 1)).toBeCloseTo(contrastRatio('#1B2A4A', '#FFFFFF'), 10);
    });
});

describe('mixColors', () => {
    it('moves from the first colour to the second', () => {
        expect(mixColors('#000000', '#FFFFFF', 0).toUpperCase()).toBe('#000000');
        expect(mixColors('#000000', '#FFFFFF', 0.5).toUpperCase()).toBe('#808080');
        expect(mixColors('#000000', '#FFFFFF', 1).toUpperCase()).toBe('#FFFFFF');
    });
});

describe('lightTone', () => {
    it('mixes a light colour toward white by the amount asked', () => {
        expect(lightTone('#efe7ec', 0.6)).toBe('#F9F5F7');
    });

    it('keeps lightening a dark colour until ink and the grey labels read on it', () => {
        const tone = lightTone('#2F2B2D', 0.6);
        expect(tooDarkForInk('#ACAAAB')).toBe(true);
        expect(tooDarkForInk(tone)).toBe(false);
        expect(tone).not.toBe('#FFFFFF');
    });
});
