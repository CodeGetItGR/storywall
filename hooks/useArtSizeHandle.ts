'use client';

import { useCallback } from 'react';

import { type DragDelta, nextGestureKey, useDragHandle } from '@/hooks/useDragHandle';
import type { InvitationEditorStore } from '@/lib/invitation/editorStore';
import { type ArtSlot, clampScale, draggedArtScale, setArtScale } from '@/lib/invitation/themeAssets';

type ArtStart = { value: number; key: string };

// The size of a theme art: dragging right makes it bigger, as the old editor's dot did.
export function useArtSizeHandle(store: InvitationEditorStore, slot: ArtSlot, scale: number) {
    const key = `theme.art.${slot}.scale`;
    const start = useCallback((): ArtStart => ({ value: scale, key: nextGestureKey(key) }), [key, scale]);
    const move = useCallback(
        (delta: DragDelta, from: ArtStart) => {
            store.getState().editTheme((theme) => setArtScale(theme, slot, draggedArtScale(from.value, delta.x, slot)), from.key, { gesture: true });
        },
        [slot, store],
    );
    const step = useCallback(
        (amount: number) => {
            store.getState().editTheme((theme) => setArtScale(theme, slot, clampScale(scale + amount / 100)), `${key}:keys`);
        },
        [key, scale, slot, store],
    );
    return useDragHandle({ start, move, step });
}
