'use client';

import { closestCenter, DndContext, type DragEndEvent, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { restrictToParentElement, restrictToVerticalAxis } from '@dnd-kit/modifiers';
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';

import { useAdminDragAnnouncements } from '@/hooks/useAdminDragAnnouncements';

const MODIFIERS = [restrictToVerticalAxis, restrictToParentElement];

// Drag and drop for the rows of one admin list. Wrap the rows (inside a
// <tbody> or a plain container); each row is an AdminSortableRow.
export function AdminSortableList({
    ids,
    disabled = false,
    onReorderAction,
    children,
}: {
    ids: string[];
    disabled?: boolean;
    onReorderAction: (activeId: string, overId: string) => void;
    children: React.ReactNode;
}) {
    const sensors = useSensors(
        // A few pixels of travel before a drag starts, so a click on the handle stays a click.
        useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
    );
    const screenReaderCopy = useAdminDragAnnouncements(ids.length);
    // dnd-kit's screen reader text goes in <body>: inside a <tbody> it would be invalid markup.
    const accessibility = { ...screenReaderCopy, container: typeof document === 'undefined' ? undefined : document.body };

    function handleDragEnd({ active, over }: DragEndEvent) {
        if (over && active.id !== over.id) onReorderAction(String(active.id), String(over.id));
    }

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            modifiers={MODIFIERS}
            accessibility={accessibility}
            onDragEnd={handleDragEnd}
        >
            <SortableContext items={ids} strategy={verticalListSortingStrategy} disabled={disabled}>
                {children}
            </SortableContext>
        </DndContext>
    );
}
