'use client';

import { useCallback, useMemo, useState } from 'react';

import type { SettingsEdit } from '@/hooks/useSectionSettings';
import type { SettingsScope } from '@/hooks/useSectionSettingsPanel';
import { feedBlockParts, feedSettingsGroups } from '@/lib/feedEditing';
import { canBeMembersOnly, setFeedBlockMembersOnly } from '@/lib/feedMembersOnly';
import { setFeedPromptText } from '@/lib/feedSections';
import type { InvitationDocument } from '@/lib/invitation/document';
import type { InvitationEditorStore } from '@/lib/invitation/editorStore';
import type { ImageUploader, UploadedImage } from '@/lib/invitation/editorUploads';
import type { MediaResolver } from '@/lib/invitation/render';
import type { InvitationSection } from '@/lib/invitation/sections';
import { settingMergeKey, settingsGroups } from '@/lib/invitation/sectionSettings';
import { fontOptions } from '@/lib/invitation/textEditing';
import type { ThemeDesign } from '@/lib/invitation/theme';
import type { InvitationFontDto } from '@/lib/invitation/uploadedFonts';
import type { SettingsPart } from '@/lib/settingsPreview';

// Photos upload to the feed (plan 7b's uploader); each one is remembered so it shows before the next read signs it.
export type FeedSheetUploads = { uploadImage: ImageUploader; remember: (image: Pick<UploadedImage, 'mediaId' | 'url'>) => void };

// The block whose pencil is open: its event parts (saved on the event at once) and its style
// groups (saved with the layout). It closes by itself when the block goes away or has nothing to set.
export function useFeedBlockSheet(
    store: InvitationEditorStore,
    document: InvitationDocument,
    theme: ThemeDesign,
    media: MediaResolver,
    uploadedFonts: InvitationFontDto[] | undefined,
    eventParts: SettingsPart[],
    { uploadImage, remember }: FeedSheetUploads,
) {
    const [openId, setOpenId] = useState<string | null>(null);
    const groupsOf = useCallback((section: InvitationSection) => feedSettingsGroups(settingsGroups(section, 'host', theme)), [theme]);
    const partsOf = useCallback((section: InvitationSection) => feedBlockParts(section.type, eventParts), [eventParts]);
    // A block with no style or event field still opens for its members-only setting, and the photo prompt for its line.
    const hasSettings = useCallback(
        (section: InvitationSection) =>
            groupsOf(section).length > 0 || partsOf(section).length > 0 || canBeMembersOnly(section) || section.type === 'feedPrompt',
        [groupsOf, partsOf],
    );

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

    const upload = useCallback<ImageUploader>(
        async (file) => {
            const image = await uploadImage(file);
            remember(image);
            return image;
        },
        [remember, uploadImage],
    );
    const addUploaded = useCallback((mediaId: string, url: string) => remember({ mediaId, url }), [remember]);

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
                      uploadImage: upload,
                      addUploaded,
                      event: null,
                      eventSamples: null,
                      eventFieldLinks: null,
                  }
                : null,
        [addUploaded, edit, fonts, media, section, theme, upload],
    );

    // null: this block can't be members only.
    const membersOnly = section && canBeMembersOnly(section) ? Boolean(section.membersOnly) : null;
    const setMembersOnly = useCallback(
        (value: boolean) => {
            if (openId) store.getState().edit(setFeedBlockMembersOnly(openId, value));
        },
        [openId, store],
    );

    // The photo prompt's line. Null on every other block.
    const promptText = section?.type === 'feedPrompt' ? section.data.text : null;
    const setPromptText = useCallback(
        (text: string) => {
            if (openId) store.getState().edit(setFeedPromptText(openId, text), settingMergeKey(openId, 'text'));
        },
        [openId, store],
    );

    const openFor = useCallback((id: string) => setOpenId(id), []);
    const close = useCallback(() => setOpenId(null), []);

    return { section, groups, parts, scope, hasSettings, groupsOf, membersOnly, setMembersOnly, promptText, setPromptText, openFor, close };
}

export type FeedBlockSheetState = ReturnType<typeof useFeedBlockSheet>;
