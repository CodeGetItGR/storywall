import { describe, expect, it } from 'vitest';

import { colorCircles, isSameColor, SOLID_COLORS } from '@/lib/colorCircles';

describe('colorCircles', () => {
    it('shows the four without a theme', () => {
        expect(colorCircles([], undefined)).toEqual([...SOLID_COLORS]);
    });

    it("puts the theme's colours first, each once", () => {
        expect(colorCircles(['#123456', '#ff7a59', '#abc', 'transparent'], undefined)).toEqual([
            '#123456',
            '#FF7A59',
            '#AABBCC',
            '#B5BFA6',
            '#AC9FC7',
            '#CFB98C',
        ]);
    });

    it('gives the colour in use its own circle, last, only when it is none of them', () => {
        expect(colorCircles([], '#010203').at(-1)).toBe('#010203');
        expect(colorCircles([], '#b5bfa6')).toEqual([...SOLID_COLORS]);
    });

    it('compares colours by what they draw', () => {
        expect(isSameColor('#ABC', '#aabbcc')).toBe(true);
        expect(isSameColor('#aabbcc', undefined)).toBe(false);
        expect(isSameColor('transparent', 'transparent')).toBe(false);
    });
});
