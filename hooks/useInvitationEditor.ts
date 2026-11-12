'use client';

import { useCallback, useMemo, useState } from 'react';

import { useAutoPublish } from '@/hooks/useAutoPublish';
import { useDraftAutosave } from '@/hooks/useDraftAutosave';
import { useDraftClaim } from '@/hooks/useDraftClaim';
import { useDraftThemes } from '@/hooks/useDraftThemes';
import { useEditorLeave } from '@/hooks/useEditorLeave';
import { useEditorSectionSettings } from '@/hooks/useEditorSectionSettings';
import { useEditorTour } from '@/hooks/useEditorTour';
import { useInvitationEditorStore } from '@/hooks/useInvitationEditorStore';
import { usePublishInvitation } from '@/hooks/usePublishInvitation';
import { useSectionActions } from '@/hooks/useSectionActions';
import { useThemeSwitch } from '@/hooks/useThemeSwitch';
import { useUndoShortcuts } from '@/hooks/useUndoShortcuts';
import { useUnsavedChangesWarning } from '@/hooks/useUnsavedChangesWarning';
import type { EditableDraft } from '@/lib/invitation/drafts';
import type { InvitationFontDto } from '@/lib/invitation/uploadedFonts';

export type EditorPanel = 'assets' | 'settings';

// Everything the editor shell shows and does for one open draft.
export function useInvitationEditor(draft: EditableDraft, uploadedFonts?: InvitationFontDto[]) {
    const editor = useInvitationEditorStore(draft.document);
    const themes = useDraftThemes(draft, editor.document);
    // The draft as the document shows it now: in the theme it names, which a switch changes.
    const shown = useMemo<EditableDraft>(
        () => ({ ...draft, theme: themes.active.theme, media: themes.media }),
        [draft, themes.active.theme, themes.media],
    );
    const { status, flush, savedRevision } = useDraftAutosave(editor.store, draft.id, draft.revision, themes.themeFor);
    const leave = useEditorLeave(flush);
    const sections = useSectionActions(editor.store, editor.document, draft.eventType);
    const sectionSettings = useEditorSectionSettings(editor.store, editor.document, shown, sections.setActiveId, uploadedFonts);
    const themeSwitch = useThemeSwitch({ store: editor.store, eventType: draft.eventType, current: themes.active, addTheme: themes.add });
    const [openPanel, setOpenPanel] = useState<EditorPanel | null>(null);
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const claim = useDraftClaim(draft.id);
    const publishing = usePublishInvitation({ draftId: draft.id, eventId: draft.eventId, flush, revision: savedRevision, claim });
    const tour = useEditorTour();

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
    // On phones the theme panel is a sheet: it closes so the picker isn't stacked on it.
    const { open: openSwitch } = themeSwitch;
    const openThemeSwitch = useCallback(() => {
        setOpenPanel(null);
        openSwitch();
    }, [openSwitch]);

    return {
        store: editor.store,
        document: editor.document,
        theme: shown.theme,
        themeName: themes.active.name,
        // The draft's images and the ones uploaded since it opened.
        media: sectionSettings.media,
        textColor: editor.document.overrides.textColor ?? shown.theme.colors.text,
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
        themeSwitch,
        openThemeSwitch,
    };
}
