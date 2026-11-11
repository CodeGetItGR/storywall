'use client';

import { ChevronRight } from 'lucide-react';
import { useCallback } from 'react';

export type SettingsItemRow = { id: string; label: string; detail?: string };

type SettingsItemRowsProps = {
    rows: SettingsItemRow[];
    onOpen: (id: string) => void;
};

// A list's items as compact rows. Tapping one opens its settings.
export function SettingsItemRows({ rows, onOpen }: SettingsItemRowsProps) {
    return (
        <ul className="flex flex-col overflow-hidden rounded-[10px] bg-(--smd-editor-control)">
            {rows.map((row) => (
                <ItemRow key={row.id} row={row} onOpen={onOpen} />
            ))}
        </ul>
    );
}

function ItemRow({ row, onOpen }: { row: SettingsItemRow; onOpen: (id: string) => void }) {
    const open = useCallback(() => onOpen(row.id), [onOpen, row.id]);

    return (
        <li className="border-b border-white/5 last:border-b-0">
            <button
                type="button"
                onClick={open}
                className="flex min-h-11 w-full items-center gap-2 px-3 py-2 text-left hover:bg-white/5 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none focus-visible:ring-inset"
            >
                {row.detail && <span className="shrink-0 text-[12px] text-(--smd-editor-muted) tabular-nums">{row.detail}</span>}
                <span className="min-w-0 flex-1 truncate text-[13px]">{row.label}</span>
                <ChevronRight aria-hidden="true" className="h-4 w-4 shrink-0 opacity-60" />
            </button>
        </li>
    );
}
