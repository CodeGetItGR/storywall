'use client';

import { useCallback, useMemo } from 'react';

import { feedCanvasTools } from '@/components/feed/edit/feedCanvasTools';
import { useFeedSectionEdits } from '@/hooks/useFeedSectionEdits';
import { elementSectionId, removeFeedBlockElement } from '@/lib/feedBlockEdits';
import type { InvitationDocument } from '@/lib/invitation/document';
import type { InvitationEditorStore } from '@/lib/invitation/editorStore';
import { feedImageUploader, type UploadedImage } from '@/lib/invitation/editorUploads';
import { type PhotoFieldSlot, removeFieldPhoto } from '@/lib/invitation/photoSlots';
import type { RenderContext } from '@/lib/invitation/render';

type FeedEditBlockToolsInput = {
    eventId: string;
    store: InvitationEditorStore;
    document: InvitationDocument;
    ctx: RenderContext;
    remember: (image: Pick<UploadedImage, 'mediaId' | 'url'>) => void;
};

// Feed edit mode's tools for the Save my date sections: their photos, text colour and background, and the ✕ on an added photo.
export function useFeedEditBlockTools({ eventId, store, document, ctx, remember }: FeedEditBlockToolsInput) {
    const upload = useMemo(() => feedImageUploader(eventId), [eventId]);
    // The inline editor's own field list is private to useInlineTextEdit; the style keys cover every field the host
    // has styled (Task 9 swaps this for edit.fieldPaths).
    const fieldPaths = useCallback(
        (sectionId: string) => Object.keys(document.sections.find((section) => section.id === sectionId)?.textStyles ?? {}),
        [document],
    );
    const edits = useFeedSectionEdits({ store, upload, remember, fieldPaths });

    const removePhoto = useCallback(
        (elementId: string) => {
            const sectionId = elementSectionId(document, elementId);
            if (sectionId) store.getState().edit(removeFeedBlockElement(sectionId, elementId));
        },
        [document, store],
    );
    const removePersonPhoto = useCallback((slot: PhotoFieldSlot) => store.getState().edit(removeFieldPhoto(slot.sectionId, slot.path)), [store]);
    const canvasTools = useMemo(
        () => feedCanvasTools({ edit: store.getState().edit, onRemoveElement: removePhoto, onRemovePhoto: removePersonPhoto }),
        [removePersonPhoto, removePhoto, store],
    );
    const editCtx = useMemo<RenderContext>(() => ({ ...ctx, canvasTools }), [canvasTools, ctx]);

    return { ...edits, ctx: editCtx };
}
