import { describe, expect, it } from 'vitest';

import {
    buildThemePresetCreatePayload,
    buildThemePresetPatchPayload,
    draftFromPreset,
    filterThemePresets,
    illustrationFileError,
    inkContrastRatio,
    MIN_INK_CONTRAST,
    normalizePresetKeyInput,
    sortThemePresets,
    themePresetStatus,
    toggleEventType,
    validateThemePresetDraft,
} from '@/lib/adminThemePresets';
import type { AdminThemePresetDto } from '@/lib/api/types';

const PRESET: AdminThemePresetDto = {
    id: 'p1',
    key: 'dino-mint',
    name: { en: 'Dino', el: 'Δεινόσαυρος' },
    backgroundColor: '#BFE6E2',
    illustrationUrl: 'https://media.example/dino.webp',
    eventTypes: ['BAPTISM'],
    sortOrder: 1,
    archived: false,
};

const VALID_DRAFT = {
    key: 'dino-mint',
    nameEn: ' Dino ',
    nameEl: 'Δεινόσαυρος',
    backgroundColor: '#bfe6e2',
    eventTypes: ['BAPTISM' as const],
    archived: false,
};

describe('validateThemePresetDraft', () => {
    it('accepts a complete draft', () => {
        expect(validateThemePresetDraft(VALID_DRAFT, true)).toEqual({});
    });

    it('flags every missing or malformed field', () => {
        expect(
            validateThemePresetDraft({ key: 'Dino Mint', nameEn: ' ', nameEl: '', backgroundColor: 'mint', eventTypes: [], archived: false }, true),
        ).toEqual({
            key: true,
            nameEn: true,
            nameEl: true,
            backgroundColor: true,
            eventTypes: true,
        });
    });

    it('rejects names over 80 characters', () => {
        expect(validateThemePresetDraft({ ...VALID_DRAFT, nameEn: 'x'.repeat(81) }, true)).toEqual({ nameEn: true });
    });

    it('flags a colour too dark for the ink text, separately from a malformed one', () => {
        expect(validateThemePresetDraft({ ...VALID_DRAFT, backgroundColor: '#241F1A' }, true)).toEqual({ backgroundContrast: true });
        expect(validateThemePresetDraft({ ...VALID_DRAFT, backgroundColor: 'nope' }, true)).toEqual({ backgroundColor: true });
    });

    it('skips the contrast check for the colour the preset already has (the server only re-checks a sent colour)', () => {
        const dark = { ...VALID_DRAFT, backgroundColor: '#241f1a' };
        expect(validateThemePresetDraft(dark, false, '#241F1A')).toEqual({});
        expect(validateThemePresetDraft(dark, false, '#FFFFFF')).toEqual({ backgroundContrast: true });
        expect(validateThemePresetDraft(dark, true, null)).toEqual({ backgroundContrast: true });
    });

    it('does not validate the key once created', () => {
        expect(validateThemePresetDraft({ ...VALID_DRAFT, key: '' }, false)).toEqual({});
    });
});

describe('normalizePresetKeyInput', () => {
    it('lower-cases and turns anything else into hyphens', () => {
        expect(normalizePresetKeyInput('Dino Mint_2')).toBe('dino-mint-2');
    });
});

describe('payloads', () => {
    it('builds a trimmed, upper-cased create payload', () => {
        expect(buildThemePresetCreatePayload(VALID_DRAFT, 4)).toEqual({
            key: 'dino-mint',
            name: { en: 'Dino', el: 'Δεινόσαυρος' },
            backgroundColor: '#BFE6E2',
            eventTypes: ['BAPTISM'],
            sortOrder: 4,
        });
    });

    it('patches only what changed', () => {
        const draft = { ...draftFromPreset(PRESET), nameEn: 'Dino!', eventTypes: ['BAPTISM' as const, 'BABY_SHOWER' as const], archived: true };
        expect(buildThemePresetPatchPayload(PRESET, draft)).toEqual({
            name: { en: 'Dino!', el: 'Δεινόσαυρος' },
            eventTypes: ['BAPTISM', 'BABY_SHOWER'],
            archived: true,
        });
    });

    it('sends nothing for an untouched preset, ignoring colour case and event-type order', () => {
        const preset = { ...PRESET, eventTypes: ['BAPTISM' as const, 'GENDER_REVEAL' as const] };
        const draft = { ...draftFromPreset(preset), backgroundColor: '#bfe6e2', eventTypes: ['GENDER_REVEAL' as const, 'BAPTISM' as const] };
        expect(buildThemePresetPatchPayload(preset, draft)).toEqual({});
    });
});

describe('toggleEventType', () => {
    it('adds and removes', () => {
        expect(toggleEventType(['BAPTISM'], 'BABY_SHOWER')).toEqual(['BAPTISM', 'BABY_SHOWER']);
        expect(toggleEventType(['BAPTISM', 'BABY_SHOWER'], 'BAPTISM')).toEqual(['BABY_SHOWER']);
    });
});

describe('themePresetStatus', () => {
    it('is archived first, then needs an illustration, else offered', () => {
        expect(themePresetStatus({ ...PRESET, archived: true, illustrationUrl: null })).toBe('ARCHIVED');
        expect(themePresetStatus({ ...PRESET, illustrationUrl: null })).toBe('NEEDS_ILLUSTRATION');
        expect(themePresetStatus(PRESET)).toBe('OFFERED');
    });
});

describe('sortThemePresets / filterThemePresets', () => {
    const second = { ...PRESET, id: 'p2', key: 'ocean', name: { en: 'Ocean', el: 'Ωκεανός' }, sortOrder: 0, archived: true };

    it('sorts by sortOrder', () => {
        expect(sortThemePresets([PRESET, second]).map((preset) => preset.id)).toEqual(['p2', 'p1']);
    });

    it('filters by status and by name or key', () => {
        expect(filterThemePresets([PRESET, second], '', 'ARCHIVED', 'en').map((preset) => preset.id)).toEqual(['p2']);
        expect(filterThemePresets([PRESET, second], 'δεινό', 'ALL', 'el').map((preset) => preset.id)).toEqual(['p1']);
        expect(filterThemePresets([PRESET, second], 'OCEAN', 'ALL', 'en').map((preset) => preset.id)).toEqual(['p2']);
    });
});

describe('illustrationFileError', () => {
    it('accepts PNG and WebP up to 5 MB', () => {
        expect(illustrationFileError(new File(['x'], 'a.png', { type: 'image/png' }))).toBeNull();
        expect(illustrationFileError(new File(['x'], 'a.webp', { type: 'image/webp' }))).toBeNull();
    });

    it('rejects other types and larger files', () => {
        expect(illustrationFileError(new File(['x'], 'a.jpg', { type: 'image/jpeg' }))).toBe('type');
        const big = new File(['x'], 'a.png', { type: 'image/png' });
        Object.defineProperty(big, 'size', { value: 5 * 1024 * 1024 + 1 });
        expect(illustrationFileError(big)).toBe('size');
    });
});

describe('inkContrastRatio', () => {
    it('is high on white, comfortable on the mint preset, and 1 against the ink itself', () => {
        expect(inkContrastRatio('#FFFFFF')).toBeGreaterThan(14);
        expect(inkContrastRatio('#BFE6E2')).toBeGreaterThanOrEqual(MIN_INK_CONTRAST);
        expect(inkContrastRatio('#241F1A')).toBeCloseTo(1, 5);
        expect(inkContrastRatio('#241f1a')).toBeCloseTo(1, 5);
    });

    it('separates near-threshold greys on each side of 4.5:1', () => {
        // Contrast against #241F1A (L = 0.0136): grey #6E6E6E sits just under 4.5, #878787 just over.
        expect(inkContrastRatio('#868686')).toBeLessThan(MIN_INK_CONTRAST);
        expect(inkContrastRatio('#878787')).toBeGreaterThanOrEqual(MIN_INK_CONTRAST);
        expect(validateThemePresetDraft({ ...VALID_DRAFT, backgroundColor: '#868686' }, true)).toEqual({ backgroundContrast: true });
        expect(validateThemePresetDraft({ ...VALID_DRAFT, backgroundColor: '#878787' }, true)).toEqual({});
    });
});
