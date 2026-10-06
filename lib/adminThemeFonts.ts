import { ApiError } from '@/lib/api/client';
import { ERROR_CODES, getErrorCode } from '@/lib/api/errors';
import type { AdminThemeFontDto, AdminThemeFontPatchDto, AdminThemeFontRequestDto } from '@/lib/api/types';

// Mirrors the backend for inline feedback only; the server sniffs the bytes and checks the glyphs.
export const THEME_FONT_KEY_PATTERN = /^[a-z0-9][a-z0-9-]{1,62}$/;
export const THEME_FONT_FAMILY_MAX = 100;
export const THEME_FONT_MAX_BYTES = 500 * 1024;
export const THEME_FONT_ACCEPT = '.woff2,font/woff2';
// Greek and Latin in one line: the admin sees at a glance whether the font covers both.
export const THEME_FONT_SAMPLE = 'Βάπτιση της Ελένης · Eleni’s Baptism 2026';
// The harder part of the required set (backend ThemeFontPipeline.REQUIRED_CHARACTERS): accented and
// diaeresis Greek, and the digits. A letter the font lacks shows in the fallback font here.
export const THEME_FONT_CHARSET_SAMPLE = 'ΑΒΓΔ αβγδ ά έ ή ί ό ύ ώ ϊ ϋ ΐ ΰ Ά Έ Ή Ί Ό Ύ Ώ 0123456789';

export type ThemeFontFallback = 'serif' | 'sans-serif';
export type ThemeFontDraft = { key: string; familyName: string; fallback: ThemeFontFallback; archived: boolean };
export type ThemeFontDraftErrors = Partial<Record<'key' | 'familyName', true>>;
export type ThemeFontStatus = 'READY' | 'NEEDS_FILE' | 'ARCHIVED';

export function draftFromFont(font: AdminThemeFontDto | null): ThemeFontDraft {
    return { key: font?.key ?? '', familyName: font?.familyName ?? '', fallback: font?.fallback ?? 'serif', archived: font?.archived ?? false };
}

export function validateThemeFontDraft(draft: ThemeFontDraft, isCreate: boolean): ThemeFontDraftErrors {
    const errors: ThemeFontDraftErrors = {};
    if (isCreate && !THEME_FONT_KEY_PATTERN.test(draft.key)) errors.key = true;
    const name = draft.familyName.trim();
    if (name.length === 0 || name.length > THEME_FONT_FAMILY_MAX) errors.familyName = true;
    return errors;
}

export function buildThemeFontCreate(draft: ThemeFontDraft): AdminThemeFontRequestDto {
    return { key: draft.key, familyName: draft.familyName.trim(), fallback: draft.fallback };
}

export function buildThemeFontPatch(font: AdminThemeFontDto, draft: ThemeFontDraft): AdminThemeFontPatchDto {
    const patch: AdminThemeFontPatchDto = {};
    if (draft.familyName.trim() !== font.familyName) patch.familyName = draft.familyName.trim();
    if (draft.fallback !== font.fallback) patch.fallback = draft.fallback;
    if (draft.archived !== font.archived) patch.archived = draft.archived;
    return patch;
}

// Browsers report an empty or odd type for .woff2, so go by the name; the server checks the bytes.
export function fontFileError(file: File): 'type' | 'size' | null {
    if (!file.name.toLowerCase().endsWith('.woff2')) return 'type';
    if (file.size > THEME_FONT_MAX_BYTES) return 'size';
    return null;
}

// A font without a file can't be put on a preset yet.
export function themeFontStatus(font: AdminThemeFontDto): ThemeFontStatus {
    if (font.archived) return 'ARCHIVED';
    if (!font.url) return 'NEEDS_FILE';
    return 'READY';
}

// Every character a 3054 says the font lacks (the localized detail lists only the first 10).
export function themeFontMissingCharacters(error: unknown): string[] {
    if (!(error instanceof ApiError) || getErrorCode(error) !== ERROR_CODES.THEME_FONT_MISSING_CHARACTERS) return [];
    const details = error.problem?.details;
    if (typeof details !== 'object' || details === null || !('missing' in details)) return [];
    const { missing } = details as { missing: unknown };
    return Array.isArray(missing) ? missing.filter((item): item is string => typeof item === 'string') : [];
}
