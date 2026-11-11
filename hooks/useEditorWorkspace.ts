'use client';

import { useCallback, useState } from 'react';

import { type SectionSettingsSource, useEditorSectionSettings } from '@/hooks/useEditorSectionSettings';
import type { useInvitationEditorStore } from '@/hooks/useInvitationEditorStore';
import { useSectionActions } from '@/hooks/useSectionActions';
import { useUndoShortcuts } from '@/hooks/useUndoShortcuts';
import { useUnsavedChangesWarning } from '@/hooks/useUnsavedChangesWarning';
import type { SaveStatus } from '@/lib/invitation/draftAutosave';
import type { InvitationFontDto } from '@/lib/invitation/uploadedFonts';

export type EditorPanel = 'assets' | 'settings';

type EditorWorkspaceOptions = {
    editor: ReturnType<typeof useInvitationEditorStore>;
    // The event type the invitation is for: it decides which sections may be added.
    eventType: string;
    source: SectionSettingsSource;
    uploadedFonts?: InvitationFontDto[];
    status: SaveStatus;
    flush: () => Promise<boolean>;
    // The host's preview shows what is stored, so it saves first. An admin's live theme
    // waits for an explicit Save, so its preview shows the edits as they are.
    previewSavesFirst: boolean;
};

// What every editor shows around the canvas, for a host's draft or an admin's theme:
// sections and their settings, the side panels, preview, undo and the unsaved-changes warning.
export function useEditorWorkspace({ editor, eventType, source, uploadedFonts, status, flush, previewSavesFirst }: EditorWorkspaceOptions) {
    const sections = useSectionActions(editor.store, editor.document, eventType);
    const sectionSettings = useEditorSectionSettings(editor.store, editor.document, source, sections.setActiveId, uploadedFonts);
    const [openPanel, setOpenPanel] = useState<EditorPanel | null>(null);
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    useUndoShortcuts(editor.undo, editor.redo);
    useUnsavedChangesWarning(status !== 'saved');

    // Waits for the save first. Publishing does the same in usePublishInvitation.
    const saveFirst = useCallback(
        async (then: (saved: boolean) => void) => {
            setIsSaving(true);
            const saved = await flush();
            setIsSaving(false);
            then(saved);
        },
        [flush],
    );

    const openPreview = useCallback(() => {
        if (previewSavesFirst) void saveFirst(() => setIsPreviewOpen(true));
        else setIsPreviewOpen(true);
    }, [previewSavesFirst, saveFirst]);
    const closePreview = useCallback(() => setIsPreviewOpen(false), []);
    const retrySave = useCallback(() => void flush(), [flush]);
    const closePanel = useCallback(() => setOpenPanel(null), []);

    return {
        store: editor.store,
        document: editor.document,
        theme: source.theme,
        // The images stored with it and the ones uploaded since it opened.
        media: sectionSettings.media,
        canUndo: editor.canUndo,
        canRedo: editor.canRedo,
        undo: editor.undo,
        redo: editor.redo,
        status,
        retrySave,
        saveFirst,
        isSaving,
        openPanel,
        setOpenPanel,
        closePanel,
        isPreviewOpen,
        openPreview,
        closePreview,
        sections,
        sectionSettings,
    };
}

export type EditorWorkspace = ReturnType<typeof useEditorWorkspace>;
