'use client';

import { useMemo } from 'react';

import type { SectionSettings, SettingsEdit } from '@/hooks/useSectionSettings';
import type { InvitationDocument } from '@/lib/invitation/document';
import type { InvitationEventData } from '@/lib/invitation/eventLinks';
import type { MediaResolver } from '@/lib/invitation/render';
import type { EditorMode } from '@/lib/invitation/sectionRules';
import type { InvitationSection } from '@/lib/invitation/sections';
import type { SettingsGroup } from '@/lib/invitation/sectionSettings';
import { type FontOption, fontOptions } from '@/lib/invitation/textEditing';
import type { ThemeDesign } from '@/lib/invitation/theme';
import type { InvitationFontDto } from '@/lib/invitation/uploadedFonts';

// What every settings group gets: the open section, how to change it, and the
// theme, fonts and images it picks from.
export type SettingsScope<S extends InvitationSection = InvitationSection> = {
    section: S;
    edit: SettingsEdit;
    mode: EditorMode;
    isAdmin: boolean;
    theme: ThemeDesign;
    media: MediaResolver;
    fonts: FontOption[];
    draftId: string;
    addUploaded: (mediaId: string, url: string) => void;
    // What the invitation follows from its event; null on no event, or until it loads.
    event: InvitationEventData | null;
};

export type SectionOf<T extends InvitationSection['type']> = Extract<InvitationSection, { type: T }>;

type PanelSources = {
    document: InvitationDocument;
    theme: ThemeDesign;
    media: MediaResolver;
    uploadedFonts?: InvitationFontDto[];
    draftId: string;
    addUploaded: (mediaId: string, url: string) => void;
    event: InvitationEventData | null;
};

// The open section's sheet: its groups and what they share. Null when nothing is open.
export function useSectionSettingsPanel(settings: SectionSettings, sources: PanelSources): { scope: SettingsScope; groups: SettingsGroup[] } | null {
    const { document, theme, media, uploadedFonts, draftId, addUploaded, event } = sources;
    const fonts = useMemo(() => fontOptions(document, theme, uploadedFonts), [document, theme, uploadedFonts]);
    const { section, groups, edit, mode } = settings;

    return useMemo(() => {
        if (!section) return null;
        return { scope: { section, edit, mode, isAdmin: mode === 'admin', theme, media, fonts, draftId, addUploaded, event }, groups };
    }, [addUploaded, draftId, edit, event, fonts, groups, media, mode, section, theme]);
}
