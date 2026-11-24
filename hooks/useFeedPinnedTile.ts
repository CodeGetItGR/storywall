'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { type CSSProperties, useCallback } from 'react';

// One of Pinned photos' tiles in its settings sheet: dragged by its handle, removed by its button. `n` is what a
// screen reader calls it while it is dragged (GALLERY_DRAG_MESSAGES).
export function useFeedPinnedTile(id: string, number: number, onRemove: (photoId: string) => void) {
    const { setNodeRef, setActivatorNodeRef, attributes, listeners, transform, transition, isDragging } = useSortable({ id, data: { n: number } });
    const style: CSSProperties = { transform: CSS.Translate.toString(transform), transition };
    const remove = useCallback(() => onRemove(id), [id, onRemove]);

    return { setNodeRef, handleRef: setActivatorNodeRef, handleProps: { ...attributes, ...listeners }, style, isDragging, remove };
}
