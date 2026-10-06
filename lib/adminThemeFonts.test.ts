import { describe, expect, it } from 'vitest';

import {
    buildThemeFontCreate,
    buildThemeFontPatch,
    fontFileError,
    THEME_FONT_ACCEPT,
    THEME_FONT_MAX_BYTES,
    THEME_FONT_SOURCE_MAX_BYTES,
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

// A file that starts with the given 4 bytes, padded to the given size.
function fontFile(magic: number[] | string, size = 4, name = 'font.bin'): File {
    const bytes = new Uint8Array(Math.max(size, 4));
    bytes.set(typeof magic === 'string' ? Array.from(magic, (char) => char.charCodeAt(0)) : magic);
    return new File([bytes], name);
}

describe('fontFileError', () => {
    // The name and the declared type say nothing: the first 4 bytes decide, as on the server.
    it.each([
        ['WOFF2', 'wOF2', 'a.ttf'],
        ['TrueType', [0x00, 0x01, 0x00, 0x00], 'a.woff2'],
        ['TrueType (Apple)', 'true', 'a'],
        ['OpenType (CFF)', 'OTTO', 'a.otf'],
    ])('accepts %s by its first bytes', async (_label, magic, name) => {
        await expect(fontFileError(fontFile(magic, 4, name))).resolves.toBeNull();
    });

    it.each([
        ['a font collection', 'ttcf'],
        ['WOFF1', 'wOFF'],
        ['anything else', '%PDF'],
    ])('refuses %s', async (_label, magic) => {
        await expect(fontFileError(fontFile(magic, 4, 'a.ttf'))).resolves.toBe('type');
    });

    it('refuses a file shorter than 4 bytes', async () => {
        await expect(fontFileError(new File(['wO'], 'a.woff2'))).resolves.toBe('type');
    });

    it('caps WOFF2 at 500 KB', async () => {
        await expect(fontFileError(fontFile('wOF2', THEME_FONT_MAX_BYTES))).resolves.toBeNull();
        await expect(fontFileError(fontFile('wOF2', THEME_FONT_MAX_BYTES + 1))).resolves.toBe('size');
    });

    it('caps TTF and OTF at 2 MB', async () => {
        expect(THEME_FONT_SOURCE_MAX_BYTES).toBe(2 * 1024 * 1024);
        await expect(fontFileError(fontFile('OTTO', THEME_FONT_SOURCE_MAX_BYTES))).resolves.toBeNull();
        await expect(fontFileError(fontFile([0x00, 0x01, 0x00, 0x00], THEME_FONT_SOURCE_MAX_BYTES))).resolves.toBeNull();
        await expect(fontFileError(fontFile('OTTO', THEME_FONT_SOURCE_MAX_BYTES + 1))).resolves.toBe('size');
    });

    it('lets the picker offer all three formats', () => {
        expect(THEME_FONT_ACCEPT).toBe('.woff2,.ttf,.otf,font/woff2,font/ttf,font/otf');
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
