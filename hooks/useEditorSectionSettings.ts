'use client';

import { useCallback, useMemo } from 'react';

import { useEditorMode } from '@/hooks/useEditorMode';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { useSectionSettings } from '@/hooks/useSectionSettings';
import { useSectionSettingsPanel } from '@/hooks/useSectionSettingsPanel';
import { useUploadedMedia } from '@/hooks/useUploadedMedia';
import type { InvitationDocument } from '@/lib/invitation/document';
import type { EditableDraft } from '@/lib/invitation/drafts';
import type { InvitationEditorStore } from '@/lib/invitation/editorStore';
import type { InvitationFontDto } from '@/lib/invitation/uploadedFonts';

// Where the side panels dock beside the canvas (EditorDockedPanel).
export const DOCKED_PANELS_QUERY = '(min-width: 1101px)';

// The section settings sheet of the editor: which section is open, the images
// uploaded meanwhile, and whether it docks beside the canvas.
export function useEditorSectionSettings(
    store: InvitationEditorStore,
    document: InvitationDocument,
    draft: EditableDraft,
    activate: (id: string) => void,
    uploadedFonts?: InvitationFontDto[],
) {
    const mode = useEditorMode();
    const uploads = useUploadedMedia(draft.media);
    const settings = useSectionSettings(store, document, draft.theme, mode);
    const isDocked = useMediaQuery(DOCKED_PANELS_QUERY);
    const panel = useSectionSettingsPanel(settings, {
        document,
        theme: draft.theme,
        media: uploads.media,
        uploadedFonts,
        draftId: draft.id,
        addUploaded: uploads.addUploaded,
    });

    const { open: openSettings, hasSettings, close } = settings;
    const open = useCallback(
        (id: string) => {
            activate(id);
            openSettings(id);
        },
        [activate, openSettings],
    );
    const opener = useMemo(() => ({ hasSettings, open }), [hasSettings, open]);

    return { media: uploads.media, addUploaded: uploads.addUploaded, panel, opener, close, isDocked };
}
