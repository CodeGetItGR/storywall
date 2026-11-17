import { describe, expect, it } from 'vitest';

import { colorInputValue } from '@/lib/invitation/colorInput';

describe('colorInputValue', () => {
    it('keeps a plain colour, in lower case', () => {
        expect(colorInputValue('#A1B2C3')).toBe('#a1b2c3');
    });

    it('expands the short form', () => {
        expect(colorInputValue('#abc')).toBe('#aabbcc');
        expect(colorInputValue('#abcd')).toBe('#aabbcc');
    });

    it('drops the alpha', () => {
        expect(colorInputValue('#11223344')).toBe('#112233');
    });

    it('falls back for transparent, nothing or anything else', () => {
        expect(colorInputValue('transparent')).toBe('#000000');
        expect(colorInputValue(undefined, '#ffffff')).toBe('#ffffff');
        expect(colorInputValue('#12345')).toBe('#000000');
    });
});
