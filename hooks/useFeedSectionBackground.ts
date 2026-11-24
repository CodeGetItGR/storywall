'use client';

import { useCallback, useMemo } from 'react';

import type { FeedBackgroundPanel } from '@/hooks/useFeedEditPanels';
import type { FeedFailedPhoto } from '@/hooks/useFeedSectionEdits';
import type { FeedBackgroundKind } from '@/lib/feedBlockMenu';
import { canHaveBackground, sectionColor, sectionPhoto } from '@/lib/feedSectionBackground';
import type { InvitationDocument } from '@/lib/invitation/document';

type FeedSectionBackgroundInput = {
    document: InvitationDocument;
    panel: FeedBackgroundPanel | null;
    open: (id: string, kind: FeedBackgroundKind) => void;
    close: () => void;
    uploadingId: string | null;
    failed: FeedFailedPhoto | null;
    setPhoto: (id: string, file: File) => Promise<boolean>;
    removePhoto: (id: string) => void;
    setColor: (id: string, color: string | undefined) => void;
};

// The section whose background sheet is open, and what the sheet does to it. It closes by itself when the section goes.
export function useFeedSectionBackground({
    document,
    panel,
    open,
    close,
    uploadingId,
    failed,
    setPhoto,
    removePhoto,
    setColor,
}: FeedSectionBackgroundInput) {
    const section = useMemo(() => {
        const found = panel && document.sections.find((item) => item.id === panel.id);
        return found && canHaveBackground(found) ? found : null;
    }, [document.sections, panel]);
    const id = section?.id ?? null;

    // A photo that didn't upload opens the sheet, which says so and takes another.
    const pickFor = useCallback(
        async (sectionId: string, file: File) => {
            if (!(await setPhoto(sectionId, file))) open(sectionId, 'photo');
        },
        [open, setPhoto],
    );
    const pick = useCallback((file: File) => void (id && pickFor(id, file)), [id, pickFor]);
    const remove = useCallback(() => {
        if (id) removePhoto(id);
        close();
    }, [close, id, removePhoto]);
    const paint = useCallback((color: string | undefined) => void (id && setColor(id, color)), [id, setColor]);

    return {
        section,
        kind: section && panel ? panel.kind : null,
        color: section ? sectionColor(section) : undefined,
        hasPhoto: section ? sectionPhoto(section) !== undefined : false,
        uploading: id !== null && uploadingId === id,
        failed: id !== null && failed?.id === id && failed.place === 'background',
        pickFor,
        pick,
        remove,
        paint,
    };
}
