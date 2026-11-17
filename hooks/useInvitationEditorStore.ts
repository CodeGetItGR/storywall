'use client';

import { useCallback, useState } from 'react';
import { useStore } from 'zustand';

import type { InvitationDocument } from '@/lib/invitation/document';
import { createInvitationEditorStore } from '@/lib/invitation/editorStore';
import type { ThemeDesign } from '@/lib/invitation/theme';

// The open draft's document and theme with their undo history, and the theme's design when an admin
// edits one. One store per editor mount.
export function useInvitationEditorStore(initialDocument: InvitationDocument, initialThemeSlug = '', initialTheme?: ThemeDesign) {
    const [store] = useState(() => createInvitationEditorStore(initialDocument, initialThemeSlug, initialTheme));
    const document = useStore(store, (state) => state.document);
    const themeSlug = useStore(store, (state) => state.themeSlug);
    const theme = useStore(store, (state) => state.theme);
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

    return { store, document, themeSlug, theme, canUndo, canRedo, undo, redo, setTextColor };
}
