'use client';

import { useCreateEventSelectionSummary } from '@/hooks/useCreateEventSelectionSummary';

// One quiet line under the step heading naming what the earlier steps picked, with a link back to change it.
export function EventCreateSelectionSummary() {
    const summary = useCreateEventSelectionSummary();
    if (!summary) return null;

    return (
        <p className="-mt-3 mb-5 flex flex-wrap items-baseline gap-x-2 text-sm text-ink-muted">
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
