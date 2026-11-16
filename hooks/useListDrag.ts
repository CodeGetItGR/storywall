'use client';

import {
    type Announcements,
    type DragEndEvent,
    KeyboardSensor,
    PointerSensor,
    type ScreenReaderInstructions,
    useSensor,
    useSensors,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { useTranslations } from 'next-intl';
import { useCallback, useMemo } from 'react';

type Dragged = { data: { current?: Record<string, unknown> } } | null;

// The row's label, as useSortableItemRow passes it in the sortable data.
function nameOf(item: Dragged): string {
    const name = item?.data.current?.name;
    return typeof name === 'string' ? name : '';
}

// The 1-based place a row is over, from dnd-kit's sortable data.
function positionOf(item: Dragged): number | null {
    const sortable = item?.data.current?.sortable as { index?: number } | undefined;
    return typeof sortable?.index === 'number' ? sortable.index + 1 : null;
}

// Dragging a settings list's rows by their handle, with a finger, a mouse or the keyboard,
// and the lines a screen reader says on the way.
export function useListDrag(count: number, onReorder: (activeId: string, overId: string) => void) {
    const t = useTranslations('InvitationEditor.sectionSettings.listDrag');
    const sensors = useSensors(
        // A few pixels of travel before a drag starts, so a tap on the handle stays a tap.
        useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
    );

    const accessibility = useMemo(
        (): { announcements: Announcements; screenReaderInstructions: ScreenReaderInstructions } => ({
            screenReaderInstructions: { draggable: t('instructions') },
            announcements: {
                onDragStart: ({ active }) => t('picked', { name: nameOf(active) }),
                onDragOver: ({ active, over }) => {
                    const position = positionOf(over);
                    return position === null ? undefined : t('over', { name: nameOf(active), position, count });
                },
                onDragEnd: ({ active, over }) => {
                    const position = positionOf(over);
                    return position === null ? t('cancelled', { name: nameOf(active) }) : t('dropped', { name: nameOf(active), position, count });
                },
                onDragCancel: ({ active }) => t('cancelled', { name: nameOf(active) }),
            },
        }),
        [count, t],
    );

    const onDragEnd = useCallback(
        ({ active, over }: DragEndEvent) => {
            if (over && active.id !== over.id) onReorder(String(active.id), String(over.id));
        },
        [onReorder],
    );

    return { sensors, accessibility, onDragEnd };
}
