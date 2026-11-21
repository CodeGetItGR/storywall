'use client';

import { useCallback, useMemo } from 'react';

import { useAutoPublish } from '@/hooks/useAutoPublish';
import { useDraftAutosave } from '@/hooks/useDraftAutosave';
import { useDraftClaim } from '@/hooks/useDraftClaim';
import { useDraftThemes } from '@/hooks/useDraftThemes';
import { useEditorLeave } from '@/hooks/useEditorLeave';
import { useEditorTour } from '@/hooks/useEditorTour';
import { useEditorWorkspace } from '@/hooks/useEditorWorkspace';
import { useInvitationAddonCheck } from '@/hooks/useInvitationAddonCheck';
import { useInvitationEditorStore } from '@/hooks/useInvitationEditorStore';
import { useInvitationEventSync } from '@/hooks/useInvitationEventSync';
import { usePhotoUploads } from '@/hooks/usePhotoUploads';
import { usePublishInvitation } from '@/hooks/usePublishInvitation';
import { useThemeSwitch } from '@/hooks/useThemeSwitch';
import type { EditableDraft } from '@/lib/invitation/drafts';
import { draftImageUploader } from '@/lib/invitation/editorUploads';
import type { InvitationFontDto } from '@/lib/invitation/uploadedFonts';

// Everything the editor shell shows and does for one open draft.
export function useInvitationEditor(draft: EditableDraft, uploadedFonts?: InvitationFontDto[]) {
    const editor = useInvitationEditorStore(draft.document, draft.themeSlug);
    const themes = useDraftThemes(draft, editor.themeSlug);
    // The draft as the document shows it now: in the theme it names, which a switch changes.
    const shown = useMemo<EditableDraft>(
        () => ({ ...draft, theme: themes.active.theme, media: themes.media }),
        [draft, themes.active.theme, themes.media],
    );
    const { status, flush, savedRevision } = useDraftAutosave(editor.store, draft.id, draft.revision, themes.themeFor);
    const leave = useEditorLeave(flush);
    const eventSync = useInvitationEventSync(editor.store, draft.eventId, shown.media, editor.themeSlug);
    // The draft's images with the event's on top; new ones go to the draft.
    const source = useMemo(
        () => ({ theme: shown.theme, media: eventSync.media, uploadImage: draftImageUploader(draft.id) }),
        [draft.id, eventSync.media, shown.theme],
    );
    const workspace = useEditorWorkspace({
        editor,
        eventType: draft.eventType,
        source,
        events: eventSync,
        uploadedFonts,
        status,
        flush,
        previewSavesFirst: true,
    });
    const themeSwitch = useThemeSwitch({ store: editor.store, eventType: draft.eventType, current: themes.active, addTheme: themes.add });
    const claim = useDraftClaim(draft.id);
    const offersInvitationAddon = useInvitationAddonCheck();
    const publishing = usePublishInvitation({
        draftId: draft.id,
        eventId: draft.eventId,
        flush,
        revision: savedRevision,
        claim,
        offersInvitationAddon,
    });
    const tour = useEditorTour();
    const photos = usePhotoUploads({ draftId: draft.id, store: editor.store, addUploaded: workspace.sectionSettings.addUploaded, claim });

    useAutoPublish(publishing.start);

    // On phones the theme panel is a sheet: it closes so the picker isn't stacked on it.
    const { setOpenPanel } = workspace;
    const { open: openSwitch } = themeSwitch;
    const openThemeSwitch = useCallback(() => {
        setOpenPanel(null);
        openSwitch();
    }, [openSwitch, setOpenPanel]);

    return {
        ...workspace,
        themeName: themes.active.name,
        // What the invitation follows from its event, once it has loaded; null for a draft on no event.
        event: eventSync.event,
        joinUrl: eventSync.joinUrl,
        // Where the host changes what the event fills; null for a draft on no event.
        fieldLinks: eventSync.fieldLinks,
        textColor: editor.document.overrides.textColor ?? shown.theme.colors.text,
        setTextColor: editor.setTextColor,
        isBusy: workspace.isSaving || leave.isLeaving || publishing.isBusy,
        publishing,
        tour,
        leave,
        themeSwitch,
        openThemeSwitch,
        photos,
    };
}
