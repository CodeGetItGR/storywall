'use client';

import type { DraggableAttributes, DraggableSyntheticListeners } from '@dnd-kit/core';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { type CSSProperties, useMemo } from 'react';

// What the drag button of a section needs.
export type SectionDragHandle = {
    activator: (element: HTMLElement | null) => void;
    attributes: DraggableAttributes;
    listeners: DraggableSyntheticListeners;
};

// One section in the editor's drag list. The name is what screen readers hear while it moves.
// Locked sections (the footer) stay where they are.
export function useSectionSortable(id: string, name: string, locked: boolean) {
    const { setNodeRef, setActivatorNodeRef, attributes, listeners, transform, transition, isDragging } = useSortable({
        id,
        data: { name },
        disabled: locked,
    });

    const style: CSSProperties = { transform: CSS.Translate.toString(transform), transition };
    const drag: SectionDragHandle = useMemo(() => ({ activator: setActivatorNodeRef, attributes, listeners }), [attributes, listeners, setActivatorNodeRef]);

    return { setNodeRef, style, isDragging, drag };
}
