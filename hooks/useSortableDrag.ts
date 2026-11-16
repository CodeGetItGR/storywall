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
type ItemValues = Record<string, string | number>;

// The lines a screen reader says while an item is dragged: where they live, and how
// each line names the item from the sortable data its row passes in.
export type DragMessages = {
    namespace: string;
    keys: { instructions: string; picked: string; over: string; dropped: string; cancelled: string };
    itemValues: (data: Record<string, unknown> | undefined) => ItemValues;
};

// The gallery's photos, named by their number (useGalleryPhotoTile passes `n`).
export const GALLERY_DRAG_MESSAGES: DragMessages = {
    namespace: 'InvitationEditor.photos.gallery',
    keys: { instructions: 'dragInstructions', picked: 'picked', over: 'over', dropped: 'dropped', cancelled: 'cancelled' },
    itemValues: (data) => ({ n: typeof data?.n === 'number' ? data.n : 0 }),
};

// A settings list's rows, named by their label (useSortableItemRow passes `name`).
export const LIST_DRAG_MESSAGES: DragMessages = {
    namespace: 'InvitationEditor.sectionSettings.listDrag',
    keys: { instructions: 'instructions', picked: 'picked', over: 'over', dropped: 'dropped', cancelled: 'cancelled' },
    itemValues: (data) => ({ name: typeof data?.name === 'string' ? data.name : '' }),
};

// The 1-based place an item is over, from dnd-kit's sortable data.
function positionOf(item: Dragged): number | null {
    const sortable = item?.data.current?.sortable as { index?: number } | undefined;
    return typeof sortable?.index === 'number' ? sortable.index + 1 : null;
}

// Dragging a list's items by their handle, with a finger, a mouse or the keyboard,
// and the lines a screen reader says on the way.
export function useSortableDrag(count: number, onReorder: (activeId: string, overId: string) => void, messages: DragMessages) {
    const t = useTranslations(messages.namespace);
    const sensors = useSensors(
        // A few pixels of travel before a drag starts, so a tap on the handle stays a tap.
        useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
    );

    const accessibility = useMemo((): { announcements: Announcements; screenReaderInstructions: ScreenReaderInstructions } => {
        const { keys, itemValues } = messages;
        const item = (dragged: Dragged) => itemValues(dragged?.data.current);
        return {
            screenReaderInstructions: { draggable: t(keys.instructions) },
            announcements: {
                onDragStart: ({ active }) => t(keys.picked, item(active)),
                onDragOver: ({ active, over }) => {
                    const position = positionOf(over);
                    return position === null ? undefined : t(keys.over, { ...item(active), position, count });
                },
                onDragEnd: ({ active, over }) => {
                    const position = positionOf(over);
                    return position === null ? t(keys.cancelled, item(active)) : t(keys.dropped, { ...item(active), position, count });
                },
                onDragCancel: ({ active }) => t(keys.cancelled, item(active)),
            },
        };
    }, [count, messages, t]);

    const onDragEnd = useCallback(
        ({ active, over }: DragEndEvent) => {
            if (over && active.id !== over.id) onReorder(String(active.id), String(over.id));
        },
        [onReorder],
    );

    return { sensors, accessibility, onDragEnd };
}
