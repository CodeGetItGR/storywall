'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState } from 'react';

import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { InvitationDocument } from '@/lib/invitation/document';
import { createDraftAutosave, type DraftAutosave, type SaveStatus } from '@/lib/invitation/draftAutosave';
import { type InvitationDraftDto, invitationDraftKeys, type InvitationDraftSavedDto } from '@/lib/invitation/drafts';
import { draftTokenHeaders } from '@/lib/invitation/draftTokens';
import type { InvitationEditorStore } from '@/lib/invitation/editorStore';

// A theme the host switched to (or back to) in the editor, for the save that switches the draft.
export type SavedTheme = { slug: string; name: string; design?: unknown; assetUrls?: Record<string, string> };

// Autosaves the editor's document to the draft. Leaving the editor sends what is unsaved. A save
// whose document carries another theme's themeId names that theme, from themeFor, so the backend
// switches the draft with it.
export function useDraftAutosave(
    store: InvitationEditorStore,
    draftId: string,
    revision: number,
    themeFor?: (themeId: string) => SavedTheme | undefined,
) {
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
        const key = invitationDraftKeys.detail(draftId);
        // The theme the stored draft has, and the design it was loaded with, so the cached copy can
        // go back to it when a host switches back.
        let savedThemeId = opened.document.themeId;
        const loadedDesigns: Record<string, unknown> = {};
        const loaded = queryClient.getQueryData<InvitationDraftDto>(key);
        if (loaded) loadedDesigns[opened.document.themeId] = loaded.design;
        const switchedTheme = (document: InvitationDocument) => (document.themeId === savedThemeId ? undefined : themeFor?.(document.themeId));

        const autosave = createDraftAutosave({
            revision: openedRevision,
            saved: opened,
            read: () => {
                const { document, changeCount } = store.getState();
                return { document, changeCount };
            },
            // Read on each call: a visitor's token goes once the draft is claimed.
            save: (nextRevision, document) => {
                const theme = switchedTheme(document);
                const body = theme ? { revision: nextRevision, document, themeSlug: theme.slug } : { revision: nextRevision, document };
                return api.put<InvitationDraftSavedDto>(path, body, { headers: draftTokenHeaders(draftId) });
            },
            loadLatest: () => api.get<InvitationDraftDto>(path, { headers: draftTokenHeaders(draftId) }),
            onStatus: setStatus,
            // The cache keeps up, so coming back to the editor opens the saved copy.
            onSaved: (savedRevision, document) => {
                const theme = switchedTheme(document);
                savedThemeId = document.themeId;
                queryClient.setQueryData<InvitationDraftDto>(key, (old) => {
                    if (!old) return old;
                    if (!theme) return { ...old, revision: savedRevision, document };
                    return {
                        ...old,
                        revision: savedRevision,
                        document,
                        themeSlug: theme.slug,
                        themeName: theme.name,
                        design: theme.design ?? loadedDesigns[document.themeId] ?? old.design,
                        imageUrls: { ...old.imageUrls, ...theme.assetUrls },
                    };
                });
            },
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
    }, [draftId, opened, openedRevision, queryClient, store, themeFor]);

    const flush = useCallback(() => autosaveRef.current?.flush() ?? Promise.resolve(true), []);
    // The stored revision after the last save, for a publish to name.
    const savedRevision = useCallback(() => autosaveRef.current?.revision() ?? openedRevision, [openedRevision]);

    return { status, flush, savedRevision };
}
