import { describe, expect, it } from 'vitest';

import { contrastRatio, relativeLuminance } from '@/lib/contrast';

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
