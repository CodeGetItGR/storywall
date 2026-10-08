'use client';

import { Pencil } from 'lucide-react';

import { useCreateEventSelectionSummary } from '@/hooks/useCreateEventSelectionSummary';

// A small chip naming what the earlier steps picked; tapping it goes back to change it.
export function EventCreateSelectionSummary() {
    const summary = useCreateEventSelectionSummary();
    if (!summary) return null;

    return (
        <button
            className="mb-3 inline-flex max-w-full items-center gap-2 rounded-full bg-surface-muted px-3 py-1.5 text-sm font-semibold text-ink transition-colors hover:bg-surface-muted/70 focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:outline-none"
            onClick={summary.onEdit}
            type="button"
        >
            <span className="truncate">{summary.label}</span>
            <Pencil aria-hidden="true" className="size-3.5 shrink-0 text-ink-muted" />
            <span className="sr-only">{summary.editLabel}</span>
        </button>
    );
}
