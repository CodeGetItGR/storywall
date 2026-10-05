import { describe, expect, it } from 'vitest';

import { eventThemeStyle, isHexColor } from '@/lib/eventTheme';

describe('isHexColor', () => {
    it('accepts #RRGGBB in either case', () => {
        expect(isHexColor('#BFE6E2')).toBe(true);
        expect(isHexColor('#bfe6e2')).toBe(true);
    });

    it('rejects everything else', () => {
        expect(isHexColor('#FFF')).toBe(false);
        expect(isHexColor('BFE6E2')).toBe(false);
        expect(isHexColor('red')).toBe(false);
        expect(isHexColor('#BFE6E2;color:red')).toBe(false);
        expect(isHexColor('')).toBe(false);
    });
});

describe('eventThemeStyle', () => {
    it('sets --event-bg for a #RRGGBB colour', () => {
        expect(eventThemeStyle('#BFE6E2')).toEqual({ '--event-bg': '#BFE6E2' });
    });

    it('is undefined without a colour, so the default background shows', () => {
        expect(eventThemeStyle(null)).toBeUndefined();
        expect(eventThemeStyle(undefined)).toBeUndefined();
        expect(eventThemeStyle('')).toBeUndefined();
    });

    it('ignores a value that is not #RRGGBB', () => {
        expect(eventThemeStyle('url(https://example.com/x.png)')).toBeUndefined();
    });
});
