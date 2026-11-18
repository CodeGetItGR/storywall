'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { type CSSProperties, useCallback } from 'react';

// One row of a sortable settings list: dragged by its handle, opened by a tap.
export function useSortableItemRow(id: string, label: string, onOpen: (id: string) => void) {
    const { setNodeRef, setActivatorNodeRef, attributes, listeners, transform, transition, isDragging } = useSortable({ id, data: { name: label } });

    const style: CSSProperties = { transform: CSS.Translate.toString(transform), transition };
    const open = useCallback(() => onOpen(id), [id, onOpen]);

    return {
        setNodeRef,
        handleRef: setActivatorNodeRef,
        handleProps: { ...attributes, ...listeners },
        style,
        isDragging,
        open,
    };
}
