import type { Locale } from '@/i18n/config';
import { ApiError } from '@/lib/api/client';
import { ERROR_CODES, getErrorCode } from '@/lib/api/errors';
import type {
    AdminThemeFontDto,
    AdminThemeFontSummaryDto,
    AdminThemePresetDto,
    AdminThemePresetPatchDto,
    AdminThemePresetRequestDto,
    EventTypeConvention,
} from '@/lib/api/types';
import { contrastRatio } from '@/lib/contrast';
import { isHexColor } from '@/lib/eventTheme';
import { resolveLocalizedText } from '@/lib/localizedText';

// Re-exported for existing admin callers; host code imports '@/lib/contrast' directly.
export { contrastRatio };

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
// The backend rejects a title colour below this against the preset's background (3055).
export const MIN_TITLE_CONTRAST = 3;

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
    // '' means none: the ink colour, the app font.
    titleColor: string;
    headingFontId: string;
};

// backgroundColor: not #RRGGBB. backgroundContrast: valid, but too dark for the ink text.
// titleColor: not #RRGGBB. titleContrast: valid, but too close to the background.
export type ThemePresetDraftErrors = Partial<
    Record<'key' | 'nameEn' | 'nameEl' | 'backgroundColor' | 'backgroundContrast' | 'titleColor' | 'titleContrast' | 'eventTypes', true>
>;

// The ratio of a #RRGGBB background against the ink text.
export function inkContrastRatio(hex: string): number {
    return contrastRatio(hex, INK_COLOR);
}

// Floored to 2 decimals like the backend's reported ratio, so a colour just under the minimum never
// reads as passing. Exactly the server's Math.floor(ratio * 100) / 100, with no epsilon: a ratio of
// 2.999999999996 must read 2.99 here too, or the hint and the server would disagree.
export function floorContrastRatio(ratio: number): number {
    return Math.floor(ratio * 100) / 100;
}

// "2.61" in English, "2,61" in Greek.
export function formatContrastRatio(ratio: number, locale: string): string {
    return new Intl.NumberFormat(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(floorContrastRatio(ratio));
}

export function draftFromPreset(preset: AdminThemePresetDto | null): ThemePresetDraft {
    return {
        key: preset?.key ?? '',
        nameEn: preset?.name.en ?? '',
        nameEl: preset?.name.el ?? '',
        backgroundColor: preset?.backgroundColor ?? DEFAULT_THEME_COLOR,
        eventTypes: preset?.eventTypes ?? [],
        archived: preset?.archived ?? false,
        titleColor: preset?.titleColor ?? '',
        headingFontId: preset?.headingFont?.id ?? '',
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

function sameColor(left: string, right: string | null | undefined): boolean {
    return left.toUpperCase() === (right ?? '').toUpperCase();
}

// savedColor / savedTitleColor: the colours the preset already has. The server re-checks the background
// only when a PATCH sends backgroundColor, and the title/background pair only when it sends either
// colour; buildThemePresetPatchPayload sends a colour only when changed, so untouched colours (even
// ones saved before a rule) must not block saving other fields.
export function validateThemePresetDraft(
    draft: ThemePresetDraft,
    isCreate: boolean,
    savedColor?: string | null,
    savedTitleColor?: string | null,
): ThemePresetDraftErrors {
    const errors: ThemePresetDraftErrors = {};
    if (isCreate && !THEME_PRESET_KEY_PATTERN.test(draft.key)) errors.key = true;
    if (!isValidName(draft.nameEn)) errors.nameEn = true;
    if (!isValidName(draft.nameEl)) errors.nameEl = true;
    if (!isHexColor(draft.backgroundColor)) errors.backgroundColor = true;
    else if (draft.backgroundColor.toUpperCase() !== savedColor?.toUpperCase() && inkContrastRatio(draft.backgroundColor) < MIN_INK_CONTRAST) {
        errors.backgroundContrast = true;
    }
    if (draft.titleColor && !isHexColor(draft.titleColor)) errors.titleColor = true;
    else if (draft.titleColor && isHexColor(draft.backgroundColor)) {
        const pairChanged = isCreate || !sameColor(draft.titleColor, savedTitleColor) || !sameColor(draft.backgroundColor, savedColor);
        if (pairChanged && contrastRatio(draft.titleColor, draft.backgroundColor) < MIN_TITLE_CONTRAST) errors.titleContrast = true;
    }
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
        headingFontId: draft.headingFontId || null,
        titleColor: draft.titleColor ? draft.titleColor.toUpperCase() : null,
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
    // Emptied means back to the default, which only a clear flag does (null means unchanged).
    if (!draft.titleColor) {
        if (preset.titleColor) patch.clearTitleColor = true;
    } else if (!sameColor(draft.titleColor, preset.titleColor)) {
        patch.titleColor = draft.titleColor.toUpperCase();
    }
    if (!draft.headingFontId) {
        if (preset.headingFont) patch.clearHeadingFont = true;
    } else if (draft.headingFontId !== preset.headingFont?.id) {
        patch.headingFontId = draft.headingFontId;
    }
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

export type ThemeFontOption = { id: string; key: string; familyName: string; status: 'live' | 'archived' | 'noFile' };

// The heading-font picker: fonts the server lets a preset newly take (live, with a file), plus the
// font the preset already has, which it keeps even once archived. Sorted by family name.
export function themeFontOptions(fonts: AdminThemeFontDto[] | undefined, assigned: AdminThemeFontSummaryDto | null): ThemeFontOption[] {
    const usable = (fonts ?? []).filter((font) => !font.archived && font.url);
    const assignedCurrent = assigned ? ((fonts ?? []).find((font) => font.id === assigned.id) ?? assigned) : null;
    const picked = assignedCurrent && !usable.some((font) => font.id === assignedCurrent.id) ? [...usable, assignedCurrent] : usable;
    return picked
        .map((font) => ({
            id: font.id,
            key: font.key,
            familyName: font.familyName,
            status: font.archived ? ('archived' as const) : font.url ? ('live' as const) : ('noFile' as const),
        }))
        .sort((left, right) => left.familyName.localeCompare(right.familyName) || left.key.localeCompare(right.key));
}

// A 3001 with no field errors, so "check the highlighted fields" would point at nothing; the detail
// is shown instead. The backend's service-level 3001s (background contrast, an event type that
// can't be themed, the other preset validation rejections) carry a localized detail. Framework-level
// 3001s (a missing multipart part, a malformed UUID) are English, but a well-formed admin client
// never triggers them.
export function isServiceValidationError(error: unknown): boolean {
    if (!(error instanceof ApiError) || getErrorCode(error) !== ERROR_CODES.VALIDATION_FAILED) return false;
    return Object.keys(error.problem?.errors ?? {}).length === 0;
}
