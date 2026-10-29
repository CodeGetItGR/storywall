import type { Locale } from '@/i18n/config';
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

export const QR_CARD_STATUS_FILTERS = ['ALL', 'LIVE', 'NO_ARTWORK', 'ARCHIVED'] as const;
export type QrCardStatusFilter = (typeof QR_CARD_STATUS_FILTERS)[number];
export type QrCardTemplateStatus = Exclude<QrCardStatusFilter, 'ALL'>;

export type QrCardTemplateDraft = {
    nameEn: string;
    nameEl: string;
    eventTypes: EventTypeConvention[];
    archived: boolean;
    textColor: string;
    // '' means none: the card's own font.
    headingFontId: string;
    codeColor: string;
    centerLogo: boolean;
};

// textColor / codeColor: not #RRGGBB. codeContrast: valid, but too light to scan on white.
export type QrCardTemplateDraftErrors = Partial<Record<'nameEn' | 'nameEl' | 'textColor' | 'codeColor' | 'codeContrast' | 'eventTypes', true>>;

// The ratio of a #RRGGBB code colour against the white panel.
export function codeContrastRatio(hex: string): number {
    return contrastRatio(hex, CODE_PANEL_COLOR);
}

// A new design starts as Plain looks: ink text and code, the logo on.
export function draftFromQrCardTemplate(template: AdminQrCardTemplateDto | null): QrCardTemplateDraft {
    return {
        nameEn: template?.name.en ?? '',
        nameEl: template?.name.el ?? '',
        eventTypes: template?.eventTypes ?? [],
        archived: template?.archived ?? false,
        textColor: template?.textColor ?? QR_CARD_INK,
        headingFontId: template?.headingFont?.id ?? '',
        codeColor: template?.codeColor ?? QR_CARD_INK,
        centerLogo: template?.centerLogo ?? true,
    };
}

function isValidName(value: string): boolean {
    const trimmed = value.trim();
    return trimmed.length > 0 && trimmed.length <= QR_CARD_NAME_MAX;
}

function sameColor(left: string, right: string | null | undefined): boolean {
    return left.toUpperCase() === (right ?? '').toUpperCase();
}

// savedCodeColor: the colour the design already has. The server re-checks contrast only when a PATCH
// sends codeColor, and the patch sends it only when changed, so an untouched colour never blocks a save.
export function validateQrCardTemplateDraft(draft: QrCardTemplateDraft, savedCodeColor?: string | null): QrCardTemplateDraftErrors {
    const errors: QrCardTemplateDraftErrors = {};
    if (!isValidName(draft.nameEn)) errors.nameEn = true;
    if (!isValidName(draft.nameEl)) errors.nameEl = true;
    if (!isHexColor(draft.textColor)) errors.textColor = true;
    if (!isHexColor(draft.codeColor)) errors.codeColor = true;
    else if (!sameColor(draft.codeColor, savedCodeColor) && codeContrastRatio(draft.codeColor) < MIN_CODE_CONTRAST) errors.codeContrast = true;
    if (draft.eventTypes.length === 0) errors.eventTypes = true;
    return errors;
}

export function buildQrCardTemplateCreatePayload(draft: QrCardTemplateDraft, sortOrder: number): AdminQrCardTemplateRequestDto {
    return {
        name: { en: draft.nameEn.trim(), el: draft.nameEl.trim() },
        eventTypes: draft.eventTypes,
        sortOrder,
        textColor: draft.textColor.toUpperCase(),
        headingFontId: draft.headingFontId || null,
        codeColor: draft.codeColor.toUpperCase(),
        centerLogo: draft.centerLogo,
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
    if (!sameColor(draft.textColor, template.textColor)) patch.textColor = draft.textColor.toUpperCase();
    // Emptied means back to the card's own font, which only a clear flag does.
    if (!draft.headingFontId) {
        if (template.headingFont) patch.clearHeadingFont = true;
    } else if (draft.headingFontId !== template.headingFont?.id) {
        patch.headingFontId = draft.headingFontId;
    }
    if (!sameColor(draft.codeColor, template.codeColor)) patch.codeColor = draft.codeColor.toUpperCase();
    if (draft.centerLogo !== template.centerLogo) patch.centerLogo = draft.centerLogo;
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
