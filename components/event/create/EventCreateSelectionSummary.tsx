'use client';

import { useCreateEventSelectionSummary } from '@/hooks/useCreateEventSelectionSummary';

// One quiet, centered line above the step heading naming what the earlier steps picked, with a link back to change it.
export function EventCreateSelectionSummary() {
    const summary = useCreateEventSelectionSummary();
    if (!summary) return null;

    return (
        <p className="mb-4 flex flex-wrap items-baseline justify-center gap-x-2 text-center text-sm text-ink-muted">
            <span>{summary.label}</span>
            <button
                aria-label={summary.editLabel}
                className="font-semibold text-ink underline decoration-ink/30 underline-offset-2 transition-colors hover:decoration-ink"
                onClick={summary.onEdit}
                type="button"
            >
                {summary.changeLabel}
            </button>
        </p>
    );
}
