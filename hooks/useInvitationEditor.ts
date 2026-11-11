'use client';

import { useMemo } from 'react';

import { useAutoPublish } from '@/hooks/useAutoPublish';
import { useDraftAutosave } from '@/hooks/useDraftAutosave';
import { useDraftClaim } from '@/hooks/useDraftClaim';
import { useEditorLeave } from '@/hooks/useEditorLeave';
import { useEditorTour } from '@/hooks/useEditorTour';
import { useEditorWorkspace } from '@/hooks/useEditorWorkspace';
import { useInvitationEditorStore } from '@/hooks/useInvitationEditorStore';
import { usePublishInvitation } from '@/hooks/usePublishInvitation';
import type { EditableDraft } from '@/lib/invitation/drafts';
import { draftImageUploader } from '@/lib/invitation/editorUploads';
import type { InvitationFontDto } from '@/lib/invitation/uploadedFonts';

// Everything the editor shell shows and does for one open draft.
export function useInvitationEditor(draft: EditableDraft, uploadedFonts?: InvitationFontDto[]) {
    const editor = useInvitationEditorStore(draft.document);
    const { status, flush, savedRevision } = useDraftAutosave(editor.store, draft.id, draft.revision);
    const leave = useEditorLeave(flush);
    const source = useMemo(() => ({ theme: draft.theme, media: draft.media, uploadImage: draftImageUploader(draft.id) }), [draft]);
    const workspace = useEditorWorkspace({ editor, eventType: draft.eventType, source, uploadedFonts, status, flush, previewSavesFirst: true });
    const claim = useDraftClaim(draft.id);
    const publishing = usePublishInvitation({ draftId: draft.id, eventId: draft.eventId, flush, revision: savedRevision, claim });
    const tour = useEditorTour();

    useAutoPublish(publishing.start);

    return {
        ...workspace,
        textColor: editor.document.overrides.textColor ?? draft.theme.colors.text,
        setTextColor: editor.setTextColor,
        isBusy: workspace.isSaving || leave.isLeaving || publishing.isBusy,
        publishing,
        tour,
        leave,
    };
}
