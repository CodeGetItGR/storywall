'use client';

import { closestCenter, DndContext } from '@dnd-kit/core';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { ChevronRight, GripVertical } from 'lucide-react';
import { useTranslations } from 'next-intl';

import type { SettingsItemRow } from '@/components/saveMyDate/editor/settings/SettingsItemRows';
import { useListDrag } from '@/hooks/useListDrag';
import { useSortableItemRow } from '@/hooks/useSortableItemRow';
import { cn } from '@/lib/utils';

type SortableItemRowsProps = {
    rows: SettingsItemRow[];
    onOpen: (id: string) => void;
    onReorder: (activeId: string, overId: string) => void;
};

const MODIFIERS = [restrictToVerticalAxis];

// A list's items as compact rows, each with a handle to drag it to another place.
// Tapping a row opens its settings.
export function SortableItemRows({ rows, onOpen, onReorder }: SortableItemRowsProps) {
    const drag = useListDrag(rows.length, onReorder);

    return (
        <DndContext sensors={drag.sensors} collisionDetection={closestCenter} accessibility={drag.accessibility} modifiers={MODIFIERS} onDragEnd={drag.onDragEnd}>
            <SortableContext items={rows} strategy={verticalListSortingStrategy}>
                <ul className="flex flex-col rounded-[10px] bg-(--smd-editor-control)">
                    {rows.map((row) => (
                        <SortableRow key={row.id} row={row} onOpen={onOpen} />
                    ))}
                </ul>
            </SortableContext>
        </DndContext>
    );
}

function SortableRow({ row, onOpen }: { row: SettingsItemRow; onOpen: (id: string) => void }) {
    const t = useTranslations('InvitationEditor.sectionSettings');
    const { setNodeRef, handleRef, handleProps, style, isDragging, open } = useSortableItemRow(row.id, row.label, onOpen);

    return (
        <li
            ref={setNodeRef}
            style={style}
            className={cn(
                'relative flex items-center border-b border-white/5 last:border-b-0',
                isDragging && 'z-10 rounded-[10px] bg-(--smd-editor-control) shadow-lg',
            )}
        >
            {/* Handle */}
            <button
                type="button"
                ref={handleRef}
                {...handleProps}
                aria-label={t('reorder')}
                title={t('reorder')}
                className="grid h-11 w-9 shrink-0 cursor-grab touch-none place-items-center text-(--smd-editor-muted) hover:text-(--smd-editor-text) focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none focus-visible:ring-inset [&_svg]:h-4 [&_svg]:w-4"
            >
                <GripVertical aria-hidden="true" />
            </button>

            {/* Row */}
            <button
                type="button"
                onClick={open}
                className="flex min-h-11 min-w-0 flex-1 items-center gap-2 py-2 pr-3 text-left hover:bg-white/5 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none focus-visible:ring-inset"
            >
                {row.detail && <span className="shrink-0 text-[12px] text-(--smd-editor-muted) tabular-nums">{row.detail}</span>}
                <span className="min-w-0 flex-1 truncate text-[13px]">{row.label}</span>
                <ChevronRight aria-hidden="true" className="h-4 w-4 shrink-0 opacity-60" />
            </button>
        </li>
    );
}
