'use client';

import { useCallback, useEffect, useState } from 'react';

import { useDraftAutosave } from '@/hooks/useDraftAutosave';
import { useEditorLeave } from '@/hooks/useEditorLeave';
import { useInvitationEditorStore } from '@/hooks/useInvitationEditorStore';
import { useUndoShortcuts } from '@/hooks/useUndoShortcuts';
import { useUnsavedChangesWarning } from '@/hooks/useUnsavedChangesWarning';
import type { EditableDraft } from '@/lib/invitation/drafts';

export type EditorPanel = 'assets' | 'settings';

// How long the "publishing isn't available yet" line stays.
export const PUBLISH_NOTICE_MS = 4000;

// Everything the editor shell shows and does for one open draft.
export function useInvitationEditor(draft: EditableDraft) {
    const editor = useInvitationEditorStore(draft.document);
    const { status, flush } = useDraftAutosave(editor.store, draft.id, draft.revision);
    const leave = useEditorLeave(flush);
    const [openPanel, setOpenPanel] = useState<EditorPanel | null>(null);
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
    const [isPublishNoticeShown, setIsPublishNoticeShown] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    useUndoShortcuts(editor.undo, editor.redo);
    useUnsavedChangesWarning(status !== 'saved');

    useEffect(() => {
        if (!isPublishNoticeShown) return;
        const timer = setTimeout(() => setIsPublishNoticeShown(false), PUBLISH_NOTICE_MS);
        return () => clearTimeout(timer);
    }, [isPublishNoticeShown]);

    // Preview and publish wait for the save first.
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
    const publish = useCallback(() => saveFirst((saved) => setIsPublishNoticeShown(saved)), [saveFirst]);
    const retrySave = useCallback(() => void flush(), [flush]);
    const closePanel = useCallback(() => setOpenPanel(null), []);

    return {
        store: editor.store,
        document: editor.document,
        theme: draft.theme,
        media: draft.media,
        textColor: editor.document.overrides.textColor ?? draft.theme.colors.text,
        setTextColor: editor.setTextColor,
        canUndo: editor.canUndo,
        canRedo: editor.canRedo,
        undo: editor.undo,
        redo: editor.redo,
        status,
        retrySave,
        isBusy: isSaving || leave.isLeaving,
        openPanel,
        setOpenPanel,
        closePanel,
        isPreviewOpen,
        openPreview,
        closePreview,
        publish,
        isPublishNoticeShown,
        leave,
    };
}
