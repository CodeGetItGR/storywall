import type { Locale } from '@/i18n/config';
import { THEME_ILLUSTRATION_TYPES } from '@/lib/adminThemePresets';
import { ApiError } from '@/lib/api/client';
import { ERROR_CODES, getErrorCode } from '@/lib/api/errors';
import type { AdminQrCardTemplateDto, AdminQrCardTemplatePatchDto, AdminQrCardTemplateRequestDto, EventTypeConvention } from '@/lib/api/types';
import { contrastRatio } from '@/lib/contrast';
import { isHexColor } from '@/lib/eventTheme';
import { resolveLocalizedText } from '@/lib/localizedText';
import { QR_CARD_INK } from '@/lib/qrCard';

// Mirrors the backend's validation (QR card templates spec, "Admin") for inline feedback only; the
// server stays the authority.
export const QR_CARD_NAME_MAX = 60;
// The code sits on a white panel; the backend rejects a code colour under this against it (3110).
export const MIN_CODE_CONTRAST = 4.5;
const CODE_PANEL_COLOR = '#FFFFFF';

// The backend's cap for QR card artwork; theme illustrations keep 5 MB.
export const QR_CARD_ARTWORK_MAX_BYTES = 10 * 1024 * 1024;

// Never resolves to an event: the code only has to scan the way a real one would.
export const QR_CARD_SAMPLE_URL = 'https://storywall.gr/q/preview';

// Type and size only; the server checks the A6 shape and the 1748 px width (3111).
export function qrCardArtworkFileError(file: File): 'type' | 'size' | null {
    if (!THEME_ILLUSTRATION_TYPES.includes(file.type)) return 'type';
    if (file.size > QR_CARD_ARTWORK_MAX_BYTES) return 'size';
    return null;
}

export const QR_CARD_STATUS_FILTERS = ['ALL', 'LIVE', 'NO_ARTWORK', 'ARCHIVED'] as const;
export type QrCardStatusFilter = (typeof QR_CARD_STATUS_FILTERS)[number];
export type QrCardTemplateStatus = Exclude<QrCardStatusFilter, 'ALL'>;

// The side panel's part of a design: what it's called, who sees it and whether it's offered.
export type QrCardTemplateDraft = {
    nameEn: string;
    nameEl: string;
    eventTypes: EventTypeConvention[];
    archived: boolean;
};

// The layout editor's part of a design besides the layout: its colours, title font and logo.
export type QrCardLookDraft = {
    textColor: string;
    // '' means none: the card's own font.
    headingFontId: string;
    codeColor: string;
    centerLogo: boolean;
};

export type QrCardTemplateDraftErrors = Partial<Record<'nameEn' | 'nameEl' | 'eventTypes', true>>;
// textColor / codeColor: not #RRGGBB. codeContrast: valid, but too light to scan on white.
export type QrCardLookDraftErrors = Partial<Record<'textColor' | 'codeColor' | 'codeContrast', true>>;

// The ratio of a #RRGGBB code colour against the white panel.
export function codeContrastRatio(hex: string): number {
    return contrastRatio(hex, CODE_PANEL_COLOR);
}

export function draftFromQrCardTemplate(template: AdminQrCardTemplateDto | null): QrCardTemplateDraft {
    return {
        nameEn: template?.name.en ?? '',
        nameEl: template?.name.el ?? '',
        eventTypes: template?.eventTypes ?? [],
        archived: template?.archived ?? false,
    };
}

// A new design starts as Plain looks: ink text and code, the logo on.
const NEW_QR_CARD_LOOK: QrCardLookDraft = { textColor: QR_CARD_INK, headingFontId: '', codeColor: QR_CARD_INK, centerLogo: true };

export function lookDraftFromQrCardTemplate(template: AdminQrCardTemplateDto): QrCardLookDraft {
    return {
        textColor: template.textColor,
        headingFontId: template.headingFont?.id ?? '',
        codeColor: template.codeColor,
        centerLogo: template.centerLogo,
    };
}

function isValidName(value: string): boolean {
    const trimmed = value.trim();
    return trimmed.length > 0 && trimmed.length <= QR_CARD_NAME_MAX;
}

function sameColor(left: string, right: string | null | undefined): boolean {
    return left.toUpperCase() === (right ?? '').toUpperCase();
}

export function validateQrCardTemplateDraft(draft: QrCardTemplateDraft): QrCardTemplateDraftErrors {
    const errors: QrCardTemplateDraftErrors = {};
    if (!isValidName(draft.nameEn)) errors.nameEn = true;
    if (!isValidName(draft.nameEl)) errors.nameEl = true;
    if (draft.eventTypes.length === 0) errors.eventTypes = true;
    return errors;
}

// savedCodeColor: the colour the design already has. The server re-checks contrast only when a PATCH
// sends codeColor, and the patch sends it only when changed, so an untouched colour never blocks a save.
export function validateQrCardLookDraft(look: QrCardLookDraft, savedCodeColor: string): QrCardLookDraftErrors {
    const errors: QrCardLookDraftErrors = {};
    if (!isHexColor(look.textColor)) errors.textColor = true;
    if (!isHexColor(look.codeColor)) errors.codeColor = true;
    else if (!sameColor(look.codeColor, savedCodeColor) && codeContrastRatio(look.codeColor) < MIN_CODE_CONTRAST) errors.codeContrast = true;
    return errors;
}

export function buildQrCardTemplateCreatePayload(draft: QrCardTemplateDraft, sortOrder: number): AdminQrCardTemplateRequestDto {
    return {
        name: { en: draft.nameEn.trim(), el: draft.nameEl.trim() },
        eventTypes: draft.eventTypes,
        sortOrder,
        textColor: NEW_QR_CARD_LOOK.textColor,
        headingFontId: null,
        codeColor: NEW_QR_CARD_LOOK.codeColor,
        centerLogo: NEW_QR_CARD_LOOK.centerLogo,
    };
}

function sameMembers(left: string[], right: string[]): boolean {
    return left.length === right.length && left.every((item) => right.includes(item));
}

// Only what changed, so the server never revalidates untouched fields.
export function buildQrCardTemplatePatchPayload(template: AdminQrCardTemplateDto, draft: QrCardTemplateDraft): AdminQrCardTemplatePatchDto {
    const patch: AdminQrCardTemplatePatchDto = {};
    const name = { en: draft.nameEn.trim(), el: draft.nameEl.trim() };
    if (name.en !== template.name.en || name.el !== template.name.el) patch.name = name;
    if (!sameMembers(draft.eventTypes, template.eventTypes)) patch.eventTypes = draft.eventTypes;
    if (draft.archived !== template.archived) patch.archived = draft.archived;
    return patch;
}

// The look's changes only, like the side panel's.
export function buildQrCardLookPatchPayload(template: AdminQrCardTemplateDto, look: QrCardLookDraft): AdminQrCardTemplatePatchDto {
    const patch: AdminQrCardTemplatePatchDto = {};
    if (!sameColor(look.textColor, template.textColor)) patch.textColor = look.textColor.toUpperCase();
    // Emptied means back to the card's own font, which only a clear flag does.
    if (!look.headingFontId) {
        if (template.headingFont) patch.clearHeadingFont = true;
    } else if (look.headingFontId !== template.headingFont?.id) {
        patch.headingFontId = look.headingFontId;
    }
    if (!sameColor(look.codeColor, template.codeColor)) patch.codeColor = look.codeColor.toUpperCase();
    if (look.centerLogo !== template.centerLogo) patch.centerLogo = look.centerLogo;
    return patch;
}

// A live design without artwork isn't offered to hosts yet.
export function qrCardTemplateStatus(template: AdminQrCardTemplateDto): QrCardTemplateStatus {
    if (template.archived) return 'ARCHIVED';
    if (!template.artworkUrl) return 'NO_ARTWORK';
    return 'LIVE';
}

export function sortQrCardTemplates(templates: AdminQrCardTemplateDto[]): AdminQrCardTemplateDto[] {
    return [...templates].sort((left, right) => left.sortOrder - right.sortOrder || left.id.localeCompare(right.id));
}

export function filterQrCardTemplates(
    templates: AdminQrCardTemplateDto[],
    search: string,
    status: QrCardStatusFilter,
    locale: Locale,
): AdminQrCardTemplateDto[] {
    const needle = search.trim().toLocaleLowerCase(locale);
    return templates.filter((template) => {
        if (status !== 'ALL' && qrCardTemplateStatus(template) !== status) return false;
        if (!needle) return true;
        return resolveLocalizedText(template.name, locale).toLocaleLowerCase(locale).includes(needle);
    });
}

// The rejections whose localized detail names the exact problem (the ratio, the artwork's size, the
// layout rule, the language at fault), so the drawer shows the detail.
const DETAIL_CODES: ReadonlySet<number> = new Set([
    ERROR_CODES.QR_CARD_CODE_COLOR_LOW_CONTRAST,
    ERROR_CODES.QR_CARD_ARTWORK_SIZE_INVALID,
    ERROR_CODES.QR_CARD_LAYOUT_INVALID,
    ERROR_CODES.LOCALIZED_TEXT_INVALID,
]);

// One of those, or a 3001 with no field errors, where "check the highlighted fields" would point at nothing.
export function isQrCardDetailError(error: unknown): boolean {
    if (!(error instanceof ApiError)) return false;
    const code = getErrorCode(error);
    if (typeof code === 'number' && DETAIL_CODES.has(code)) return true;
    if (code !== ERROR_CODES.VALIDATION_FAILED) return false;
    return Object.keys(error.problem?.errors ?? {}).length === 0;
}

// A layout length for the editor, always one decimal: 8 → "8.0" ("8,0" in Greek).
export function formatMm(value: number, locale: string): string {
    return new Intl.NumberFormat(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(value);
}
