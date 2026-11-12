import type { Draft } from 'immer';

import {
    type AdminInvitationThemeDto,
    type AdminInvitationThemeRequestDto,
    type InvitationThemeStatus,
    themeDetails,
    themeUpdateRequest,
} from '@/lib/adminInvitationThemes';
import { type InvitationDocument, upgradeInvitationDocument } from '@/lib/invitation/document';
import type { MediaResolver } from '@/lib/invitation/render';
import { THEME_BACKGROUND_SLOTS } from '@/lib/invitation/sectionStyle';
import { type ThemeDesign, themeDesignSchema } from '@/lib/invitation/theme';

// An admin's theme in the invitation editor (KAN-68): the theme's design and its
// default invitation, saved together to /api/admin/invitation-themes/{id}.

export type EditableTheme = {
    id: string;
    status: InvitationThemeStatus;
    eventType: string;
    revision: number;
    document: InvitationDocument;
    design: ThemeDesign;
    media: MediaResolver;
    // The theme as loaded: a save sends its other fields back unchanged.
    dto: AdminInvitationThemeDto;
};

// Throws when the stored design or document isn't in the format the editor draws.
export function readEditableTheme(dto: AdminInvitationThemeDto): EditableTheme {
    const urls = Object.fromEntries(dto.assets.map((asset) => [asset.assetId, asset.url]));
    return {
        id: dto.id,
        status: dto.status,
        eventType: dto.eventType,
        revision: dto.revision,
        document: upgradeInvitationDocument(dto.document),
        design: themeDesignSchema.parse(dto.design),
        media: (mediaId) => urls[mediaId],
        dto,
    };
}

// Draft themes save as you go. Active and Hidden ones reach hosts' drafts and the
// storefront at once, so they wait for an explicit Save.
export type ThemeSaveMode = 'auto' | 'manual';

export function themeSaveMode(status: InvitationThemeStatus): ThemeSaveMode {
    return status === 'DRAFT' ? 'auto' : 'manual';
}

// What the editor saves: the design, the default invitation and the share image.
export type ThemeContent = { design: ThemeDesign; document: InvitationDocument; shareImageId: string | null };

// A PUT replaces every field: the loaded theme's details with the edited content.
export function themeContentRequest(dto: AdminInvitationThemeDto, content: ThemeContent, revision: number): AdminInvitationThemeRequestDto {
    return {
        ...themeUpdateRequest(dto, themeDetails(dto)),
        design: content.design as unknown as Record<string, unknown>,
        document: content.document as unknown as Record<string, unknown>,
        ogImageAssetId: content.shareImageId,
        revision,
    };
}

// ---- Theme style ----

export const BACKGROUND_MODES = ['cover', 'repeat', 'texture'] as const;
export type BackgroundMode = (typeof BACKGROUND_MODES)[number];
export type BackgroundSlot = (typeof THEME_BACKGROUND_SLOTS)[number];

// The old editor's colours for a button that has none of its own (wedartOpenThemeStyle).
export const DEFAULT_BUTTON_TEXT = '#24332f';

// A font pairing from GET /api/invitation-typography-presets (InvitationTypographyPresetOptionDto).
export type TypographyPresetOption = { id: string; name: string; titleFont: string; bodyFont: string; buttonFont: string | null };

// Every font a section or text picked for itself. Keys ending in "font" are the
// format's font fields; sizes, colours and the rest stay (old wedartClearSectionFontOverrides).
export function clearSectionFontOverrides(sections: Draft<InvitationDocument['sections']>) {
    const walk = (value: unknown) => {
        if (!value || typeof value !== 'object') return;
        if (Array.isArray(value)) {
            value.forEach(walk);
            return;
        }
        const record = value as Record<string, unknown>;
        for (const key of Object.keys(record)) {
            if (/font$/i.test(key)) delete record[key];
            else walk(record[key]);
        }
    };
    walk(sections);
}

// Picking a pairing sets the theme's fonts from it and makes it the new base:
// the fonts sections chose for themselves go.
export function applyTypographyPreset(theme: Draft<ThemeDesign>, document: Draft<InvitationDocument>, preset: TypographyPresetOption) {
    theme.typographyPresetId = preset.id;
    theme.fonts.title = preset.titleFont;
    theme.fonts.body = preset.bodyFont;
    if (preset.buttonFont) theme.fonts.button = preset.buttonFont;
    else delete theme.fonts.button;
    clearSectionFontOverrides(document.sections);
}

// A font picked by hand leaves the pairing.
export function setThemeFont(theme: Draft<ThemeDesign>, slot: 'title' | 'body' | 'button', font: string) {
    delete theme.typographyPresetId;
    if (slot === 'button' && !font) delete theme.fonts.button;
    else theme.fonts[slot] = font;
}
