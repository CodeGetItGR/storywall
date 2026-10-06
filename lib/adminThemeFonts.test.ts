import { describe, expect, it } from 'vitest';

import {
    buildThemeFontCreate,
    buildThemeFontPatch,
    fontFileError,
    THEME_FONT_MAX_BYTES,
    themeFontMissingCharacters,
    themeFontStatus,
    validateThemeFontDraft,
} from '@/lib/adminThemeFonts';
import { ApiError } from '@/lib/api/client';
import type { AdminThemeFontDto } from '@/lib/api/types';

const FONT: AdminThemeFontDto = { id: '1', key: 'k', familyName: 'A', fallback: 'serif', archived: false, url: null, presetCount: 0 };

describe('validateThemeFontDraft', () => {
    it('needs a key on create and a display name', () => {
        expect(validateThemeFontDraft({ key: 'A b', familyName: ' ', fallback: 'serif', archived: false }, true)).toEqual({
            key: true,
            familyName: true,
        });
        expect(validateThemeFontDraft({ key: 'dino-serif', familyName: 'Dino Serif', fallback: 'serif', archived: false }, true)).toEqual({});
    });

    it('ignores the key when editing and caps the name at 100 characters', () => {
        expect(validateThemeFontDraft({ key: '', familyName: 'x'.repeat(100), fallback: 'serif', archived: false }, false)).toEqual({});
        expect(validateThemeFontDraft({ key: '', familyName: 'x'.repeat(101), fallback: 'serif', archived: false }, false)).toEqual({
            familyName: true,
        });
    });
});

describe('fontFileError', () => {
    it('flags a non-.woff2 name and an oversize file', () => {
        expect(fontFileError(new File(['x'], 'a.ttf'))).toBe('type');
        expect(fontFileError(new File([new Uint8Array(THEME_FONT_MAX_BYTES + 1)], 'a.woff2'))).toBe('size');
        expect(fontFileError(new File(['x'], 'a.WOFF2'))).toBeNull();
    });
});

describe('buildThemeFontCreate', () => {
    it('trims the display name', () => {
        expect(buildThemeFontCreate({ key: 'gfs-didot', familyName: ' GFS Didot ', fallback: 'serif', archived: false })).toEqual({
            key: 'gfs-didot',
            familyName: 'GFS Didot',
            fallback: 'serif',
        });
    });
});

describe('buildThemeFontPatch', () => {
    it('sends only what changed', () => {
        expect(buildThemeFontPatch(FONT, { key: 'k', familyName: 'A', fallback: 'sans-serif', archived: false })).toEqual({ fallback: 'sans-serif' });
        expect(buildThemeFontPatch(FONT, { key: 'k', familyName: ' A ', fallback: 'serif', archived: true })).toEqual({ archived: true });
    });
});

describe('themeFontStatus', () => {
    it('is archived first, then needs a file, then ready', () => {
        expect(themeFontStatus({ ...FONT, archived: true, url: '/api/theme-fonts/k/1.woff2' })).toBe('ARCHIVED');
        expect(themeFontStatus(FONT)).toBe('NEEDS_FILE');
        expect(themeFontStatus({ ...FONT, url: '/api/theme-fonts/k/1.woff2' })).toBe('READY');
    });
});

describe('themeFontMissingCharacters', () => {
    it('reads details.missing from a 3054', () => {
        const error = new ApiError(400, { errorCode: 3054, detail: 'missing', details: { missing: ['ΐ', 'ΰ', 7] } });
        expect(themeFontMissingCharacters(error)).toEqual(['ΐ', 'ΰ']);
    });

    it('is empty for anything else', () => {
        expect(themeFontMissingCharacters(new ApiError(400, { errorCode: 3052, details: { missing: ['a'] } }))).toEqual([]);
        expect(themeFontMissingCharacters(new Error('x'))).toEqual([]);
    });
});
