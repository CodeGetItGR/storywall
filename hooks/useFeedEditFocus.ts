'use client';

import { useCallback, useRef } from 'react';

type Target = 'cancel' | 'edit';

// Where focus goes as edit mode opens and closes: to Cancel once edit mode is drawn, and back
// to the Edit pencil after. editPencil and cancelPill are callback refs: each focuses its button as it mounts, so a slow edit chunk is fine.
export function useFeedEditFocus(start: () => void, finish: () => void) {
    const next = useRef<Target | null>(null);

    const focusIfNext = useCallback((target: Target, node: HTMLElement | null) => {
        if (node === null || next.current !== target) return;
        next.current = null;
        node.focus();
    }, []);
    const editPencil = useCallback((node: HTMLButtonElement | null) => focusIfNext('edit', node), [focusIfNext]);
    const cancelPill = useCallback((node: HTMLButtonElement | null) => focusIfNext('cancel', node), [focusIfNext]);

    const startEditing = useCallback(() => {
        next.current = 'cancel';
        start();
    }, [start]);
    const finishEditing = useCallback(() => {
        next.current = 'edit';
        finish();
    }, [finish]);

    return { start: startEditing, finish: finishEditing, editPencil, cancelPill };
}
