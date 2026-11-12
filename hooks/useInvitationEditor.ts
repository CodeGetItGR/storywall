'use client';

import { useCallback, useState } from 'react';

import { useAutoPublish } from '@/hooks/useAutoPublish';
import { useDraftAutosave } from '@/hooks/useDraftAutosave';
import { useDraftClaim } from '@/hooks/useDraftClaim';
import { useEditorLeave } from '@/hooks/useEditorLeave';
import { useEditorSectionSettings } from '@/hooks/useEditorSectionSettings';
import { useEditorTour } from '@/hooks/useEditorTour';
import { useInvitationEditorStore } from '@/hooks/useInvitationEditorStore';
import { useInvitationEventSync } from '@/hooks/useInvitationEventSync';
import { usePhotoUploads } from '@/hooks/usePhotoUploads';
import { usePublishInvitation } from '@/hooks/usePublishInvitation';
import { useSectionActions } from '@/hooks/useSectionActions';
import { useUndoShortcuts } from '@/hooks/useUndoShortcuts';
import { useUnsavedChangesWarning } from '@/hooks/useUnsavedChangesWarning';
import type { EditableDraft } from '@/lib/invitation/drafts';
import type { InvitationFontDto } from '@/lib/invitation/uploadedFonts';

export type EditorPanel = 'assets' | 'settings';

// Everything the editor shell shows and does for one open draft.
export function useInvitationEditor(draft: EditableDraft, uploadedFonts?: InvitationFontDto[]) {
    const editor = useInvitationEditorStore(draft.document);
    const { status, flush, savedRevision } = useDraftAutosave(editor.store, draft.id, draft.revision);
    const leave = useEditorLeave(flush);
    const sections = useSectionActions(editor.store, editor.document, draft.eventType);
    const eventSync = useInvitationEventSync(editor.store, draft.eventId, draft.media);
    const sectionSettings = useEditorSectionSettings(editor.store, editor.document, draft, sections.setActiveId, uploadedFonts, eventSync);
    const [openPanel, setOpenPanel] = useState<EditorPanel | null>(null);
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const claim = useDraftClaim(draft.id);
    const publishing = usePublishInvitation({ draftId: draft.id, eventId: draft.eventId, flush, revision: savedRevision, claim });
    const tour = useEditorTour();
    const photos = usePhotoUploads({ draftId: draft.id, store: editor.store, addUploaded: sectionSettings.addUploaded, claim });

    useAutoPublish(publishing.start);

    useUndoShortcuts(editor.undo, editor.redo);
    useUnsavedChangesWarning(status !== 'saved');

    // Preview waits for the save first; publishing does the same in usePublishInvitation.
    const saveFirst = useCallback(
        async (then: (saved: boolean) => void) => {
            setIsSaving(true);
            const saved = await flush();
            setIsSaving(false);
            then(saved);
        },
        [flush],
    );

    const openPreview = useCallback(() => saveFirst(() => setIsPreviewOpen(true)), [saveFirst]);
    const closePreview = useCallback(() => setIsPreviewOpen(false), []);
    const retrySave = useCallback(() => void flush(), [flush]);
    const closePanel = useCallback(() => setOpenPanel(null), []);

    return {
        store: editor.store,
        document: editor.document,
        theme: draft.theme,
        // The draft's images, the ones uploaded since it opened, and the event's.
        media: sectionSettings.media,
        // What the invitation follows from its event, once it has loaded; null for a draft on no event.
        event: eventSync.event,
        joinUrl: eventSync.joinUrl,
        textColor: editor.document.overrides.textColor ?? draft.theme.colors.text,
        setTextColor: editor.setTextColor,
        canUndo: editor.canUndo,
        canRedo: editor.canRedo,
        undo: editor.undo,
        redo: editor.redo,
        status,
        retrySave,
        isBusy: isSaving || leave.isLeaving || publishing.isBusy,
        openPanel,
        setOpenPanel,
        closePanel,
        isPreviewOpen,
        openPreview,
        closePreview,
        publishing,
        tour,
        leave,
        sections,
        sectionSettings,
        photos,
    };
}
