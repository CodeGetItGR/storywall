import { describe, expect, it } from 'vitest';

import {
    buildThemePresetCreatePayload,
    buildThemePresetPatchPayload,
    contrastRatio,
    draftFromPreset,
    filterThemePresets,
    floorContrastRatio,
    formatContrastRatio,
    illustrationFileError,
    inkContrastRatio,
    isServiceValidationError,
    MIN_INK_CONTRAST,
    MIN_TITLE_CONTRAST,
    normalizePresetKeyInput,
    sortThemePresets,
    themeFontOptions,
    themePresetStatus,
    toggleEventType,
    validateThemePresetDraft,
} from '@/lib/adminThemePresets';
import { ApiError } from '@/lib/api/client';
import type { AdminThemeFontDto, AdminThemePresetDto } from '@/lib/api/types';

const PRESET: AdminThemePresetDto = {
    id: 'p1',
    key: 'dino-mint',
    name: { en: 'Dino', el: 'Δεινόσαυρος' },
    backgroundColor: '#BFE6E2',
    illustrationUrl: 'https://media.example/dino.webp',
    eventTypes: ['BAPTISM'],
    sortOrder: 1,
    archived: false,
    titleColor: null,
    headingFont: null,
};

const VALID_DRAFT = {
    key: 'dino-mint',
    nameEn: ' Dino ',
    nameEl: 'Δεινόσαυρος',
    backgroundColor: '#bfe6e2',
    eventTypes: ['BAPTISM' as const],
    archived: false,
    titleColor: '',
    headingFontId: '',
};

describe('validateThemePresetDraft', () => {
    it('accepts a complete draft', () => {
        expect(validateThemePresetDraft(VALID_DRAFT, true)).toEqual({});
    });

    it('flags every missing or malformed field', () => {
        expect(
            validateThemePresetDraft(
                {
                    key: 'Dino Mint',
                    nameEn: ' ',
                    nameEl: '',
                    backgroundColor: 'mint',
                    eventTypes: [],
                    archived: false,
                    titleColor: '',
                    headingFontId: '',
                },
                true,
            ),
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
            headingFontId: null,
            titleColor: null,
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

const FONT_SUMMARY = {
    id: 'f1',
    key: 'alegreya',
    familyName: 'Alegreya',
    fallback: 'serif' as const,
    archived: false,
    url: '/api/theme-fonts/alegreya/1.woff2',
};

describe('title colour and heading font', () => {
    const base = { ...VALID_DRAFT, backgroundColor: '#FFFFFF' };
    const savedPreset: AdminThemePresetDto = { ...PRESET, backgroundColor: '#FFFFFF' };

    it('flags a title colour under 3:1 against the background', () => {
        const draft = { ...base, titleColor: '#F5C6D0' };
        expect(validateThemePresetDraft(draft, true).titleContrast).toBe(true);
        expect(validateThemePresetDraft({ ...draft, titleColor: '#7A1F3D' }, true).titleContrast).toBeUndefined();
        expect(validateThemePresetDraft({ ...draft, titleColor: '' }, true).titleContrast).toBeUndefined(); // empty = ink
    });

    it('flags a malformed title colour separately', () => {
        expect(validateThemePresetDraft({ ...base, titleColor: '#12' }, true)).toEqual({ titleColor: true });
    });

    it('re-checks the pair only when either colour changed, as the server does', () => {
        const low = { ...base, titleColor: '#f5c6d0' };
        // Both untouched: the PATCH sends neither colour, so the server doesn't re-check.
        expect(validateThemePresetDraft(low, false, '#FFFFFF', '#F5C6D0')).toEqual({});
        // The title changed.
        expect(validateThemePresetDraft(low, false, '#FFFFFF', '#7A1F3D')).toEqual({ titleContrast: true });
        // The background changed under an existing title.
        const greyer = { ...base, backgroundColor: '#E0E0E0', titleColor: '#BBBBBB' };
        expect(validateThemePresetDraft(greyer, false, '#FFFFFF', '#BBBBBB')).toEqual({ titleContrast: true });
    });

    it('creates with the font and an upper-cased title colour, or null for none', () => {
        expect(buildThemePresetCreatePayload({ ...base, titleColor: '#7a1f3d', headingFontId: 'f1' }, 0)).toMatchObject({
            titleColor: '#7A1F3D',
            headingFontId: 'f1',
        });
        expect(buildThemePresetCreatePayload(base, 0)).toMatchObject({ titleColor: null, headingFontId: null });
    });

    it('fills the draft from the preset, empty for none', () => {
        expect(draftFromPreset(savedPreset)).toMatchObject({ titleColor: '', headingFontId: '' });
        expect(draftFromPreset({ ...savedPreset, titleColor: '#7A1F3D', headingFont: FONT_SUMMARY })).toMatchObject({
            titleColor: '#7A1F3D',
            headingFontId: 'f1',
        });
    });

    it('patch clears what the admin emptied and sends what changed', () => {
        const preset = { ...savedPreset, titleColor: '#7A1F3D', headingFont: FONT_SUMMARY };
        expect(buildThemePresetPatchPayload(preset, { ...draftFromPreset(preset), titleColor: '', headingFontId: '' })).toEqual({
            clearTitleColor: true,
            clearHeadingFont: true,
        });
        expect(buildThemePresetPatchPayload(preset, { ...draftFromPreset(preset), headingFontId: 'f2' })).toEqual({ headingFontId: 'f2' });
        expect(buildThemePresetPatchPayload(preset, { ...draftFromPreset(preset), titleColor: '#5a1f3d' })).toEqual({ titleColor: '#5A1F3D' });
        // Case alone is no change.
        expect(buildThemePresetPatchPayload(preset, { ...draftFromPreset(preset), titleColor: '#7a1f3d' })).toEqual({});
    });

    it('sends no clear flag when the preset had nothing to clear', () => {
        expect(buildThemePresetPatchPayload(savedPreset, draftFromPreset(savedPreset))).toEqual({});
    });
});

describe('contrastRatio', () => {
    it('is symmetric, 21 for black on white, and the ink ratio is the special case', () => {
        expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 5);
        expect(contrastRatio('#FFFFFF', '#000000')).toBeCloseTo(21, 5);
        expect(inkContrastRatio('#BFE6E2')).toBeCloseTo(contrastRatio('#BFE6E2', '#241F1A'), 10);
        expect(MIN_TITLE_CONTRAST).toBe(3);
    });

    it('floors to 2 decimals, so a ratio just under the minimum never reads as passing', () => {
        expect(floorContrastRatio(2.999)).toBe(2.99);
        expect(floorContrastRatio(4.5)).toBe(4.5);
    });

    it('floors a ratio a hair under 3 to 2.99, as the server does (e.g. #5A256F on #1E93A7)', () => {
        expect(formatContrastRatio(2.999999999996, 'en')).toBe('2.99');
        expect(formatContrastRatio(2.999999999996, 'el')).toBe('2,99');
    });

    it('formats the floored ratio with the locale decimal separator and two decimals', () => {
        expect(formatContrastRatio(2.6189, 'en')).toBe('2.61');
        expect(formatContrastRatio(2.6189, 'el')).toBe('2,61');
        expect(formatContrastRatio(4.5, 'en')).toBe('4.50');
        expect(formatContrastRatio(12.3456, 'el')).toBe('12,34');
    });
});

describe('themeFontOptions', () => {
    const font = (overrides: Partial<AdminThemeFontDto>): AdminThemeFontDto => ({ ...FONT_SUMMARY, presetCount: 0, ...overrides });

    it('offers live fonts with a file, sorted by family name', () => {
        const fonts = [
            font({ id: 'b', key: 'zz', familyName: 'Zilla' }),
            font({ id: 'a', key: 'aa', familyName: 'Alegreya' }),
            font({ id: 'c', familyName: 'Archived', archived: true }),
            font({ id: 'd', familyName: 'No file', url: null }),
        ];
        expect(themeFontOptions(fonts, null)).toEqual([
            { id: 'a', key: 'aa', familyName: 'Alegreya', status: 'live' },
            { id: 'b', key: 'zz', familyName: 'Zilla', status: 'live' },
        ]);
    });

    it('keeps the assigned font even when it is archived or has no file', () => {
        const archived = { ...FONT_SUMMARY, id: 'c', familyName: 'Old', archived: true };
        expect(themeFontOptions([font({ id: 'a', familyName: 'Bree' })], archived).map((option) => [option.id, option.status])).toEqual([
            ['a', 'live'],
            ['c', 'archived'],
        ]);
        // The list's copy wins (it is fresher).
        const listed = font({ id: 'd', familyName: 'Draft', url: null });
        expect(themeFontOptions([listed], { ...FONT_SUMMARY, id: 'd' })).toEqual([
            { id: 'd', key: 'alegreya', familyName: 'Draft', status: 'noFile' },
        ]);
        // Not loaded yet: the assigned font still shows.
        expect(themeFontOptions(undefined, FONT_SUMMARY)).toEqual([{ id: 'f1', key: 'alegreya', familyName: 'Alegreya', status: 'live' }]);
    });
});

describe('isServiceValidationError', () => {
    it('is a 3001 with no field errors: the background contrast check, a type that cannot be themed', () => {
        expect(
            isServiceValidationError(new ApiError(400, { errorCode: 3001, detail: 'Πολύ σκούρο: 3,60:1', details: { ratio: 3.6, minimum: 4.5 } })),
        ).toBe(true);
        expect(isServiceValidationError(new ApiError(400, { errorCode: 3001, detail: 'Δεν υποστηρίζει θέματα.' }))).toBe(true);
        expect(isServiceValidationError(new ApiError(400, { errorCode: 3001, detail: '', errors: {} }))).toBe(true);
    });

    it('is not a bean-validation 3001 (field errors), another code, or a network failure', () => {
        expect(isServiceValidationError(new ApiError(400, { errorCode: 3001, detail: 'One or more fields are invalid', errors: { key: 'x' } }))).toBe(
            false,
        );
        expect(isServiceValidationError(new ApiError(400, { errorCode: 3055, detail: 'x', details: { ratio: 2, minimum: 3 } }))).toBe(false);
        expect(isServiceValidationError(new Error('Failed to fetch'))).toBe(false);
    });
});
