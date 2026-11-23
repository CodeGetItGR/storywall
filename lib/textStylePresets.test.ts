import { describe, expect, it } from 'vitest';

import type { TextStylePresetDto } from '@/lib/api/types';
import { presetCss, presetName, presetSample, presetStyle } from '@/lib/textStylePresets';

const PRESET: TextStylePresetDto = {
    id: 'p',
    nameEn: 'Calligraphy',
    nameEl: 'Καλλιγραφικό',
    font: "'Great Vibes', cursive",
    size: 40,
    weight: 'BOLD',
    italic: true,
    letterSpacing: 1.5,
    uppercase: false,
    sortOrder: 0,
};

describe('text style presets', () => {
    it('restyles a text with every field but its colour', () => {
        expect(presetStyle(PRESET)).toEqual({ font: "'Great Vibes', cursive", size: 40, bold: true, italic: true, letterSpacing: 1.5, uppercase: false });
        expect('color' in presetStyle(PRESET)).toBe(false);
    });

    it('draws a preset on the start of the text, or its name for an empty text', () => {
        expect(presetSample('Μαρία & Νίκος\nΣας προσκαλούμε', PRESET, 'el')).toBe('Μαρία & Νίκος');
        expect(presetSample('A'.repeat(40), PRESET, 'en')).toBe('A'.repeat(24));
        expect(presetSample('   ', PRESET, 'el')).toBe('Καλλιγραφικό');
    });

    it('draws a preset as itself, with the size capped when asked', () => {
        expect(presetCss(PRESET)).toEqual({
            fontFamily: "'Great Vibes', cursive",
            fontSize: 40,
            fontWeight: 700,
            fontStyle: 'italic',
            letterSpacing: '1.5px',
            textTransform: 'none',
        });
        expect(presetCss(PRESET, 26).fontSize).toBe(26);
    });

    it('names a preset in the page language', () => {
        expect(presetName(PRESET, 'el')).toBe('Καλλιγραφικό');
        expect(presetName(PRESET, 'en')).toBe('Calligraphy');
    });
});
