'use client';

import { useCallback, useState } from 'react';
import { useStore } from 'zustand';

import type { InvitationDocument } from '@/lib/invitation/document';
import { createInvitationEditorStore } from '@/lib/invitation/editorStore';

// The open draft's document with its undo history. One store per editor mount.
export function useInvitationEditorStore(initialDocument: InvitationDocument) {
    const [store] = useState(() => createInvitationEditorStore(initialDocument));
    const document = useStore(store, (state) => state.document);
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

    return { store, document, canUndo, canRedo, undo, redo, setTextColor };
}
