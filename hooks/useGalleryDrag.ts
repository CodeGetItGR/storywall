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

// The photo's number when the drag started, as useGalleryPhotoTile passes it in the sortable data.
function numberOf(item: Dragged): number {
    const n = item?.data.current?.n;
    return typeof n === 'number' ? n : 0;
}

// The 1-based place a photo is over, from dnd-kit's sortable data.
function positionOf(item: Dragged): number | null {
    const sortable = item?.data.current?.sortable as { index?: number } | undefined;
    return typeof sortable?.index === 'number' ? sortable.index + 1 : null;
}

// Dragging the gallery's photos by their handle, with a finger, a mouse or the keyboard.
export function useGalleryDrag(count: number, onReorder: (activeId: string, overId: string) => void) {
    const t = useTranslations('InvitationEditor.photos.gallery');
    const sensors = useSensors(
        // A few pixels of travel before a drag starts, so a tap on the handle stays a tap.
        useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
    );

    const accessibility = useMemo(
        (): { announcements: Announcements; screenReaderInstructions: ScreenReaderInstructions } => ({
            screenReaderInstructions: { draggable: t('dragInstructions') },
            announcements: {
                onDragStart: ({ active }) => t('picked', { n: numberOf(active) }),
                onDragOver: ({ active, over }) => {
                    const position = positionOf(over);
                    return position === null ? undefined : t('over', { n: numberOf(active), position, count });
                },
                onDragEnd: ({ active, over }) => {
                    const position = positionOf(over);
                    return position === null ? t('cancelled', { n: numberOf(active) }) : t('dropped', { n: numberOf(active), position, count });
                },
                onDragCancel: ({ active }) => t('cancelled', { n: numberOf(active) }),
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
