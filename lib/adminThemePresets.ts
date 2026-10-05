import type { Locale } from '@/i18n/config';
import type { AdminThemePresetDto, AdminThemePresetPatchDto, AdminThemePresetRequestDto, EventTypeConvention } from '@/lib/api/types';
import { isHexColor } from '@/lib/eventTheme';
import { resolveLocalizedText } from '@/lib/localizedText';

// Mirrors the backend's validation (event theme spec, "Admin" API) for inline
// feedback only; the server stays the authority.
export const THEME_PRESET_KEY_PATTERN = /^[a-z0-9][a-z0-9-]{1,62}$/;
export const THEME_PRESET_NAME_MAX = 80;
export const THEME_ILLUSTRATION_MAX_BYTES = 5 * 1024 * 1024;
export const THEME_ILLUSTRATION_TYPES = ['image/png', 'image/webp'];
export const THEME_ILLUSTRATION_ACCEPT = THEME_ILLUSTRATION_TYPES.join(',');
const DEFAULT_THEME_COLOR = '#FFFFFF';

// Mirrors the --ink token in app/globals.css (the app's text colour on a themed
// background). The backend rejects backgrounds below MIN_INK_CONTRAST against it.
export const INK_COLOR = '#241F1A';
export const MIN_INK_CONTRAST = 4.5;

export const THEME_PRESET_STATUS_FILTERS = ['ALL', 'OFFERED', 'NEEDS_ILLUSTRATION', 'ARCHIVED'] as const;
export type ThemePresetStatusFilter = (typeof THEME_PRESET_STATUS_FILTERS)[number];
export type ThemePresetStatus = Exclude<ThemePresetStatusFilter, 'ALL'>;

export type ThemePresetDraft = {
    key: string;
    nameEn: string;
    nameEl: string;
    backgroundColor: string;
    eventTypes: EventTypeConvention[];
    archived: boolean;
};

// backgroundColor: not #RRGGBB. backgroundContrast: valid, but too dark for the ink text.
export type ThemePresetDraftErrors = Partial<Record<'key' | 'nameEn' | 'nameEl' | 'backgroundColor' | 'backgroundContrast' | 'eventTypes', true>>;

function relativeLuminance(hex: string): number {
    const [red, green, blue] = [1, 3, 5].map((start) => {
        const channel = parseInt(hex.slice(start, start + 2), 16) / 255;
        return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

// WCAG 2.x contrast ratio (1–21) of a #RRGGBB background against the ink text.
export function inkContrastRatio(hex: string): number {
    const background = relativeLuminance(hex);
    const ink = relativeLuminance(INK_COLOR);
    return (Math.max(background, ink) + 0.05) / (Math.min(background, ink) + 0.05);
}

export function draftFromPreset(preset: AdminThemePresetDto | null): ThemePresetDraft {
    return {
        key: preset?.key ?? '',
        nameEn: preset?.name.en ?? '',
        nameEl: preset?.name.el ?? '',
        backgroundColor: preset?.backgroundColor ?? DEFAULT_THEME_COLOR,
        eventTypes: preset?.eventTypes ?? [],
        archived: preset?.archived ?? false,
    };
}

// As the admin types: lower-case, anything outside [a-z0-9-] becomes a hyphen.
export function normalizePresetKeyInput(value: string): string {
    return value.toLowerCase().replace(/[^a-z0-9-]/g, '-');
}

function isValidName(value: string): boolean {
    const trimmed = value.trim();
    return trimmed.length > 0 && trimmed.length <= THEME_PRESET_NAME_MAX;
}

export function validateThemePresetDraft(draft: ThemePresetDraft, isCreate: boolean): ThemePresetDraftErrors {
    const errors: ThemePresetDraftErrors = {};
    if (isCreate && !THEME_PRESET_KEY_PATTERN.test(draft.key)) errors.key = true;
    if (!isValidName(draft.nameEn)) errors.nameEn = true;
    if (!isValidName(draft.nameEl)) errors.nameEl = true;
    if (!isHexColor(draft.backgroundColor)) errors.backgroundColor = true;
    else if (inkContrastRatio(draft.backgroundColor) < MIN_INK_CONTRAST) errors.backgroundContrast = true;
    if (draft.eventTypes.length === 0) errors.eventTypes = true;
    return errors;
}

export function buildThemePresetCreatePayload(draft: ThemePresetDraft, sortOrder: number): AdminThemePresetRequestDto {
    return {
        key: draft.key,
        name: { en: draft.nameEn.trim(), el: draft.nameEl.trim() },
        backgroundColor: draft.backgroundColor.toUpperCase(),
        eventTypes: draft.eventTypes,
        sortOrder,
    };
}

function sameMembers(left: string[], right: string[]): boolean {
    return left.length === right.length && left.every((item) => right.includes(item));
}

// Only what changed, so the server never revalidates untouched fields.
export function buildThemePresetPatchPayload(preset: AdminThemePresetDto, draft: ThemePresetDraft): AdminThemePresetPatchDto {
    const patch: AdminThemePresetPatchDto = {};
    const name = { en: draft.nameEn.trim(), el: draft.nameEl.trim() };
    if (name.en !== preset.name.en || name.el !== preset.name.el) patch.name = name;
    const backgroundColor = draft.backgroundColor.toUpperCase();
    if (backgroundColor !== preset.backgroundColor.toUpperCase()) patch.backgroundColor = backgroundColor;
    if (!sameMembers(draft.eventTypes, preset.eventTypes)) patch.eventTypes = draft.eventTypes;
    if (draft.archived !== preset.archived) patch.archived = draft.archived;
    return patch;
}

export function toggleEventType(selected: EventTypeConvention[], eventType: EventTypeConvention): EventTypeConvention[] {
    return selected.includes(eventType) ? selected.filter((item) => item !== eventType) : [...selected, eventType];
}

// A live preset without an illustration isn't offered to hosts yet.
export function themePresetStatus(preset: AdminThemePresetDto): ThemePresetStatus {
    if (preset.archived) return 'ARCHIVED';
    if (!preset.illustrationUrl) return 'NEEDS_ILLUSTRATION';
    return 'OFFERED';
}

export function sortThemePresets(presets: AdminThemePresetDto[]): AdminThemePresetDto[] {
    return [...presets].sort((left, right) => left.sortOrder - right.sortOrder || left.key.localeCompare(right.key));
}

export function filterThemePresets(
    presets: AdminThemePresetDto[],
    search: string,
    status: ThemePresetStatusFilter,
    locale: Locale,
): AdminThemePresetDto[] {
    const needle = search.trim().toLocaleLowerCase(locale);
    return presets.filter((preset) => {
        if (status !== 'ALL' && themePresetStatus(preset) !== status) return false;
        if (!needle) return true;
        const name = resolveLocalizedText(preset.name, locale, preset.key).toLocaleLowerCase(locale);
        return name.includes(needle) || preset.key.includes(needle);
    });
}

// The declared type, for quick feedback; the server sniffs the real bytes.
export function illustrationFileError(file: File): 'type' | 'size' | null {
    if (!THEME_ILLUSTRATION_TYPES.includes(file.type)) return 'type';
    if (file.size > THEME_ILLUSTRATION_MAX_BYTES) return 'size';
    return null;
}
