'use client';

import type { MouseEvent } from 'react';

import { cn } from '@/lib/utils';

export type ReactionTypeAvailability = 'AVAILABLE' | 'ARCHIVED';

const OPTIONS: ReactionTypeAvailability[] = ['AVAILABLE', 'ARCHIVED'];

export function ReactionTypeAvailabilityControl({
    title,
    value,
    onChangeAction,
    labels,
    hints,
}: {
    title: string;
    value: ReactionTypeAvailability;
    onChangeAction: (availability: ReactionTypeAvailability) => void;
    labels: Record<ReactionTypeAvailability, string>;
    hints: Record<ReactionTypeAvailability, string>;
}) {
    function handleClick(event: MouseEvent<HTMLButtonElement>) {
        onChangeAction(event.currentTarget.dataset.availability as ReactionTypeAvailability);
    }

    return (
        <div className="border-t border-border pt-4">
            <p className="mb-2 text-sm font-bold text-ink">{title}</p>
            <div className="flex gap-1 rounded-lg bg-canvas p-1">
                {OPTIONS.map((option) => (
                    <button
                        key={option}
                        type="button"
                        data-availability={option}
                        onClick={handleClick}
                        aria-pressed={value === option}
                        className={cn(
                            'flex-1 rounded-md px-2 py-1.5 text-[12.5px] font-bold transition-colors',
                            value === option ? 'bg-card text-ink shadow-sm' : 'text-ink-faint hover:text-ink-muted'
                        )}
                    >
                        {labels[option]}
                    </button>
                ))}
            </div>
            <p className="mt-2 text-xs leading-5 text-ink-faint">{hints[value]}</p>
        </div>
    );
}
