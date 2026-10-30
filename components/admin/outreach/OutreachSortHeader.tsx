'use client';

import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import { type MouseEvent } from 'react';

import type { OutreachSort, OutreachSortField } from '@/lib/adminOutreach';
import { cn } from '@/lib/utils';

export function OutreachSortHeader({
    field,
    label,
    sort,
    onSortAction,
    className,
}: {
    field: OutreachSortField;
    label: string;
    sort: OutreachSort;
    onSortAction: (event: MouseEvent<HTMLButtonElement>) => void;
    className?: string;
}) {
    const direction = sort?.field === field ? sort.direction : null;
    const Icon = direction === 'asc' ? ArrowUp : direction === 'desc' ? ArrowDown : ArrowUpDown;

    return (
        <th
            scope="col"
            aria-sort={direction === 'asc' ? 'ascending' : direction === 'desc' ? 'descending' : undefined}
            className={cn('px-3 py-2.5 font-bold', className)}
        >
            <button
                type="button"
                data-sort-field={field}
                onClick={onSortAction}
                className="inline-flex items-center gap-1 tracking-wide uppercase hover:text-ink"
            >
                {label}
                <Icon aria-hidden="true" className={cn('h-3 w-3', direction ? 'text-ink' : 'opacity-50')} />
            </button>
        </th>
    );
}
