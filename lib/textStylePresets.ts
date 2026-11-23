import type { CSSProperties } from 'react';

import type { TextStylePresetDto, TextStylePresetRequestDto } from '@/lib/api/types';
import type { TextStylePatch } from '@/lib/invitation/textEditing';

// How long a stretch of the edited text the Style menu draws each preset on (Open question 6).
export const PRESET_SAMPLE_LENGTH = 24;

// What picking a preset writes into the text's style: everything it sets; the text keeps its colour.
export function presetStyle(preset: TextStylePresetDto): TextStylePatch {
    return {
        font: preset.font,
        size: preset.size,
        bold: preset.weight === 'BOLD',
        italic: preset.italic,
        letterSpacing: preset.letterSpacing,
        uppercase: preset.uppercase,
    };
}

// A preset drawn as itself (the Style menu, the admin preview); maxSize caps the size so a large one still fits.
export function presetCss(preset: TextStylePresetRequestDto, maxSize = Infinity): CSSProperties {
    return {
        fontFamily: preset.font,
        fontSize: Math.min(preset.size, maxSize),
        fontWeight: preset.weight === 'BOLD' ? 700 : 400,
        fontStyle: preset.italic ? 'italic' : 'normal',
        letterSpacing: `${preset.letterSpacing}px`,
        textTransform: preset.uppercase ? 'uppercase' : 'none',
    };
}

export function presetName(preset: Pick<TextStylePresetDto, 'nameEn' | 'nameEl'>, locale: string): string {
    return locale === 'en' ? preset.nameEn : preset.nameEl;
}

// The start of the text being edited (its first line, up to PRESET_SAMPLE_LENGTH characters), or the preset's name
// when the text is empty.
export function presetSample(text: string, preset: TextStylePresetDto, locale: string): string {
    const firstLine = text.trim().split('\n')[0]?.trim() ?? '';
    return firstLine ? [...firstLine].slice(0, PRESET_SAMPLE_LENGTH).join('') : presetName(preset, locale);
}
