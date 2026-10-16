'use client';

import type { DraggableAttributes, DraggableSyntheticListeners } from '@dnd-kit/core';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import { createContext, useContext, useMemo } from 'react';

import { cn } from '@/lib/utils';

type DragHandle = {
    activator: (element: HTMLElement | null) => void;
    attributes: DraggableAttributes;
    listeners: DraggableSyntheticListeners;
};

// Hands the row's drag listeners to the handle AdminOrderArrows draws inside it.
const DragHandleContext = createContext<DragHandle | null>(null);

export function useAdminDragHandle(): DragHandle | null {
    return useContext(DragHandleContext);
}

// One draggable row of an AdminSortableList: a <tr> in a table, an <li> in a list, a <div> elsewhere.
export function AdminSortableRow({
    id,
    name,
    as = 'tr',
    className,
    children,
}: {
    id: string;
    name: string;
    as?: 'tr' | 'li' | 'div';
    className?: string;
    children: React.ReactNode;
}) {
    const { setNodeRef, setActivatorNodeRef, attributes, listeners, transform, transition, isDragging } = useSortable({ id, data: { name } });
    const handle = useMemo(() => ({ activator: setActivatorNodeRef, attributes, listeners }), [attributes, listeners, setActivatorNodeRef]);
    const Element = as;

    return (
        <DragHandleContext.Provider value={handle}>
            <Element
                ref={setNodeRef}
                style={{ transform: CSS.Translate.toString(transform), transition }}
                className={cn(className, isDragging && 'relative z-10 bg-card shadow-[0_8px_24px_-12px_rgba(18,20,28,0.35)]')}
            >
                {children}
            </Element>
        </DragHandleContext.Provider>
    );
}

// The grip a row is dragged by, drawn by AdminOrderArrows next to the arrows.
export function AdminDragHandle({ handle, label, disabled, className }: { handle: DragHandle; label: string; disabled: boolean; className: string }) {
    const { activator, attributes, listeners } = handle;

    return (
        <button
            type="button"
            ref={activator}
            {...attributes}
            {...listeners}
            disabled={disabled}
            aria-label={label}
            className={cn(className, 'cursor-grab touch-none active:cursor-grabbing')}
        >
            <GripVertical className="h-4 w-4" aria-hidden="true" />
        </button>
    );
}
