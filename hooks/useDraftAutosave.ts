'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState } from 'react';

import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import { createDraftAutosave, type DraftAutosave, type SaveStatus } from '@/lib/invitation/draftAutosave';
import { type InvitationDraftDto, invitationDraftKeys, type InvitationDraftSavedDto } from '@/lib/invitation/drafts';
import type { InvitationEditorStore } from '@/lib/invitation/editorStore';

// Autosaves the editor's document to the draft. Leaving the editor sends what is unsaved.
export function useDraftAutosave(store: InvitationEditorStore, draftId: string, revision: number) {
    const queryClient = useQueryClient();
    const [status, setStatus] = useState<SaveStatus>('saved');
    // The revision the editor opened at. Later ones come from the saves themselves.
    const [openedRevision] = useState(revision);
    // The document that revision holds, taken on the first render. An edit can land before
    // the effect below starts the autosave, and it must still count as unsaved.
    const [opened] = useState(() => {
        const { document, changeCount } = store.getState();
        return { document, changeCount };
    });
    const autosaveRef = useRef<DraftAutosave | null>(null);

    useEffect(() => {
        const path = endpoints.invitationDrafts.byId(draftId);
        const autosave = createDraftAutosave({
            revision: openedRevision,
            saved: opened,
            read: () => {
                const { document, changeCount } = store.getState();
                return { document, changeCount };
            },
            save: (nextRevision, document) => api.put<InvitationDraftSavedDto>(path, { revision: nextRevision, document }),
            loadLatest: () => api.get<InvitationDraftDto>(path),
            onStatus: setStatus,
            // The cache keeps up, so coming back to the editor opens the saved copy.
            onSaved: (savedRevision, document) =>
                queryClient.setQueryData<InvitationDraftDto>(invitationDraftKeys.detail(draftId), (old) =>
                    old ? { ...old, revision: savedRevision, document } : old,
                ),
        });
        autosaveRef.current = autosave;
        const unsubscribe = store.subscribe((state, previous) => {
            if (state.changeCount !== previous.changeCount) autosave.changed();
        });
        if (store.getState().changeCount !== opened.changeCount) autosave.changed();

        return () => {
            unsubscribe();
            autosave.dispose({ save: true });
            autosaveRef.current = null;
        };
    }, [draftId, opened, openedRevision, queryClient, store]);

    const flush = useCallback(() => autosaveRef.current?.flush() ?? Promise.resolve(true), []);
    // The stored revision after the last save, for a publish to name.
    const savedRevision = useCallback(() => autosaveRef.current?.revision() ?? openedRevision, [openedRevision]);

    return { status, flush, savedRevision };
}
