'use client';

import { useCallback, useState } from 'react';
import { useStore } from 'zustand';

import type { InvitationDocument } from '@/lib/invitation/document';
import { createInvitationEditorStore } from '@/lib/invitation/editorStore';

// The open draft's document and theme with their undo history. One store per editor mount.
export function useInvitationEditorStore(initialDocument: InvitationDocument, initialThemeSlug = '') {
    const [store] = useState(() => createInvitationEditorStore(initialDocument, initialThemeSlug));
    const document = useStore(store, (state) => state.document);
    const themeSlug = useStore(store, (state) => state.themeSlug);
    const canUndo = useStore(store, (state) => state.past.length > 0);
    const canRedo = useStore(store, (state) => state.future.length > 0);
    const undo = useCallback(() => store.getState().undo(), [store]);
    const redo = useCallback(() => store.getState().redo(), [store]);

    const setTextColor = useCallback(
        (color: string) =>
            store.getState().edit((draft) => {
                draft.overrides.textColor = color;
            }, 'textColor'),
        [store],
    );

    return { store, document, themeSlug, canUndo, canRedo, undo, redo, setTextColor };
}
