'use client';

import type { QuizPollsTallyEntry } from '@/lib/api/types';

/** A typed poll's answers, grouped, most given first. No names. */
export function TypedTally({ entries, format }: { entries: QuizPollsTallyEntry[]; format: (value: string) => string }) {
    return (
        <ul className="divide-y divide-border/60 overflow-hidden rounded-2xl bg-surface-muted/60">
            {entries.map((entry) => (
                <li key={entry.value} className="flex items-start gap-3 px-4 py-2.5 text-sm text-ink">
                    <span className="min-w-0 flex-1 whitespace-pre-line">{format(entry.value)}</span>
                    {entry.count > 1 && <span className="shrink-0 text-xs font-semibold text-ink-muted tabular-nums">×{entry.count}</span>}
                </li>
            ))}
        </ul>
    );
}
