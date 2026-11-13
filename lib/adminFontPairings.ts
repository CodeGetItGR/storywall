import type { AdminThemeFontDto } from '@/lib/api/types';
import { fontLabel, type FontOption, INVITATION_FONTS, sameFont, uploadedFontOptions } from '@/lib/invitation/textEditing';
import { sameEventTypes } from '@/lib/saveMyDateEventTypes';

// Save my date font pairings (/api/admin/invitation-typography-presets): a title, text and button
// font the invitation editor offers together.

// InvitationTypographyPresetAdminDto. eventTypes is sorted; empty means every event type.
export type AdminFontPairingDto = {
    id: string;
    name: string;
    titleFont: string;
    bodyFont: string;
    // Null or empty: buttons use the text font.
    buttonFont: string | null;
    hidden: boolean;
    sortOrder: number;
    eventTypes: string[];
};

// InvitationTypographyPresetRequestDto. On a change, a field left out stays as it is; an empty
// buttonFont clears it.
export type AdminFontPairingRequestDto = {
    name?: string;
    titleFont?: string;
    bodyFont?: string;
    buttonFont?: string;
    hidden?: boolean;
    sortOrder?: number;
    eventTypes?: string[];
};

export const FONT_PAIRING_NAME_MAX = 100;

// The preview's sample wording. Not translated: an invitation is written in Greek.
export const FONT_PAIRING_SAMPLE = { title: 'Μαρία & Νίκος', body: 'Σάββατο 12 Σεπτεμβρίου 2026', button: 'Θα έρθω' } as const;

export type FontPairingDraft = {
    name: string;
    titleFont: string;
    bodyFont: string;
    // '' means the text font.
    buttonFont: string;
    hidden: boolean;
    eventTypes: string[];
};
export type FontPairingDraftErrors = Partial<Record<'name' | 'titleFont' | 'bodyFont', true>>;

// A new pairing starts on the editor's first font, so its title and text selects always hold one.
const DEFAULT_FONT = INVITATION_FONTS[0]?.value ?? '';

export function draftFromPairing(pairing: AdminFontPairingDto | null, defaultFont = DEFAULT_FONT): FontPairingDraft {
    return {
        name: pairing?.name ?? '',
        titleFont: pairing?.titleFont ?? defaultFont,
        bodyFont: pairing?.bodyFont ?? defaultFont,
        buttonFont: pairing?.buttonFont ?? '',
        hidden: pairing?.hidden ?? false,
        eventTypes: [...(pairing?.eventTypes ?? [])].sort(),
    };
}

export function validateFontPairingDraft(draft: FontPairingDraft): FontPairingDraftErrors {
    const errors: FontPairingDraftErrors = {};
    const name = draft.name.trim();
    if (name.length === 0 || name.length > FONT_PAIRING_NAME_MAX) errors.name = true;
    if (!draft.titleFont) errors.titleFont = true;
    if (!draft.bodyFont) errors.bodyFont = true;
    return errors;
}

// `sortOrder` puts the new pairing last (nextSortOrder of the list); after that the list's drag and drop moves it.
export function buildFontPairingCreate(draft: FontPairingDraft, sortOrder: number): AdminFontPairingRequestDto {
    return {
        name: draft.name.trim(),
        titleFont: draft.titleFont,
        bodyFont: draft.bodyFont,
        buttonFont: draft.buttonFont,
        hidden: draft.hidden,
        sortOrder,
        eventTypes: draft.eventTypes,
    };
}

// Only what changed, so a save never overwrites a field someone else changed meanwhile.
export function buildFontPairingPatch(pairing: AdminFontPairingDto, draft: FontPairingDraft): AdminFontPairingRequestDto {
    const patch: AdminFontPairingRequestDto = {};
    if (draft.name.trim() !== pairing.name) patch.name = draft.name.trim();
    if (draft.titleFont !== pairing.titleFont) patch.titleFont = draft.titleFont;
    if (draft.bodyFont !== pairing.bodyFont) patch.bodyFont = draft.bodyFont;
    if (draft.buttonFont !== (pairing.buttonFont ?? '')) patch.buttonFont = draft.buttonFont;
    if (draft.hidden !== pairing.hidden) patch.hidden = draft.hidden;
    if (!sameEventTypes(draft.eventTypes, pairing.eventTypes)) patch.eventTypes = draft.eventTypes;
    return patch;
}

// The fonts a pairing can use: the editor's own, then Save my date's uploaded fonts that are ready.
// A value already on the pairing that neither list has (an archived font, say) stays in the list.
export function fontPairingFontOptions(uploaded: readonly AdminThemeFontDto[], current: readonly string[] = []): FontOption[] {
    const ready = uploaded.filter((font) => !font.archived && font.url).map((font) => ({ ...font, url: font.url ?? '' }));
    const options: FontOption[] = [...INVITATION_FONTS, ...uploadedFontOptions(ready)];
    for (const value of current) {
        if (value && !options.some((option) => sameFont(option.value, value))) options.push({ value, label: fontLabel(value) });
    }
    return options;
}

// The option a stored value matches, so a select shows it even when the spacing differs.
export function matchingFontValue(options: readonly FontOption[], value: string): string {
    if (!value) return '';
    return options.find((option) => option.value === value)?.value ?? options.find((option) => sameFont(option.value, value))?.value ?? value;
}

// A stored font's display name, for the table.
export function fontPairingFontLabel(value: string | null): string {
    return value ? fontLabel(value) : '';
}
