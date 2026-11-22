'use client';

import { useCallback, useMemo, useState } from 'react';

import type { SettingsEdit } from '@/hooks/useSectionSettings';
import type { SettingsScope } from '@/hooks/useSectionSettingsPanel';
import { feedBlockParts, feedSettingsGroups, noFeedUploads } from '@/lib/feedEditing';
import type { InvitationDocument } from '@/lib/invitation/document';
import type { InvitationEditorStore } from '@/lib/invitation/editorStore';
import type { MediaResolver } from '@/lib/invitation/render';
import type { InvitationSection } from '@/lib/invitation/sections';
import { settingMergeKey, settingsGroups } from '@/lib/invitation/sectionSettings';
import { fontOptions } from '@/lib/invitation/textEditing';
import type { ThemeDesign } from '@/lib/invitation/theme';
import type { InvitationFontDto } from '@/lib/invitation/uploadedFonts';
import type { SettingsPart } from '@/lib/settingsPreview';

const ignoreUpload = () => undefined;

// The block whose pencil is open: its event parts (saved on the event at once) and its style
// groups (saved with the layout). It closes by itself when the block goes away or has nothing to set.
export function useFeedBlockSheet(
    store: InvitationEditorStore,
    document: InvitationDocument,
    theme: ThemeDesign,
    media: MediaResolver,
    uploadedFonts: InvitationFontDto[] | undefined,
    eventParts: SettingsPart[],
) {
    const [openId, setOpenId] = useState<string | null>(null);
    const groupsOf = useCallback((section: InvitationSection) => feedSettingsGroups(settingsGroups(section, 'host', theme)), [theme]);
    const partsOf = useCallback((section: InvitationSection) => feedBlockParts(section.type, eventParts), [eventParts]);
    const hasSettings = useCallback((section: InvitationSection) => groupsOf(section).length > 0 || partsOf(section).length > 0, [groupsOf, partsOf]);

    const found = useMemo(() => document.sections.find((section) => section.id === openId) ?? null, [document.sections, openId]);
    const section = found && hasSettings(found) ? found : null;
    const groups = useMemo(() => (section ? groupsOf(section) : []), [groupsOf, section]);
    const parts = useMemo(() => (section ? partsOf(section) : []), [partsOf, section]);
    const fonts = useMemo(() => fontOptions(document, theme, uploadedFonts), [document, theme, uploadedFonts]);

    const edit = useCallback<SettingsEdit>(
        (recipe, field) => {
            if (openId) store.getState().edit(recipe, field ? settingMergeKey(openId, field) : undefined);
        },
        [openId, store],
    );

    const scope = useMemo<SettingsScope | null>(
        () =>
            section
                ? {
                      section,
                      edit,
                      mode: 'host',
                      isAdmin: false,
                      theme,
                      media,
                      fonts,
                      uploadImage: noFeedUploads,
                      addUploaded: ignoreUpload,
                      event: null,
                      eventSamples: null,
                      eventFieldLinks: null,
                  }
                : null,
        [edit, fonts, media, section, theme],
    );

    const openFor = useCallback((id: string) => setOpenId(id), []);
    const close = useCallback(() => setOpenId(null), []);

    return { section, groups, parts, scope, hasSettings, groupsOf, openFor, close };
}

export type FeedBlockSheetState = ReturnType<typeof useFeedBlockSheet>;
