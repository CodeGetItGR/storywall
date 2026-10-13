'use client';

import type { Announcements, ScreenReaderInstructions } from '@dnd-kit/core';
import { useTranslations } from 'next-intl';
import { useMemo } from 'react';

type Draggable = { id: string | number; data: { current?: Record<string, unknown> } };
type DraggableWithIndex = { data: { current?: Record<string, unknown> } } | null;

// The row's name, as AdminSortableRow passes it in the sortable data.
function nameOf(item: Draggable): string {
    const name = item.data.current?.name;
    return typeof name === 'string' ? name : String(item.id);
}

// The 1-based place a row is over, from dnd-kit's sortable data.
function positionOf(item: DraggableWithIndex): number | null {
    const sortable = item?.data.current?.sortable as { index?: number } | undefined;
    return typeof sortable?.index === 'number' ? sortable.index + 1 : null;
}

// What screen readers hear while a row is dragged with the keyboard.
export function useAdminDragAnnouncements(count: number): {
    announcements: Announcements;
    screenReaderInstructions: ScreenReaderInstructions;
} {
    const t = useTranslations('AdminPage.order');

    return useMemo(
        () => ({
            screenReaderInstructions: { draggable: t('dragInstructions') },
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
}
