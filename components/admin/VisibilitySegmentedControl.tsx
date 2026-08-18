'use client';

import { type MouseEvent } from 'react';

import { type Visibility, VISIBILITY_OPTIONS } from '@/lib/adminVisibility';
import { cn } from '@/lib/utils';

export function VisibilitySegmentedControl({
    title,
    value,
    onChange,
    labels,
    hints,
}: {
    title: string;
    value: Visibility;
    onChange: (visibility: Visibility) => void;
    labels: Record<Visibility, string>;
    hints: Record<Visibility, string>;
}) {
    function handleClick(event: MouseEvent<HTMLButtonElement>) {
        onChange(event.currentTarget.dataset.visibility as Visibility);
    }

    return (
        <div className="border-t border-border pt-4">
            <p className="mb-2 text-sm font-bold text-ink">{title}</p>
            <div className="flex gap-1 rounded-lg bg-canvas p-1">
                {VISIBILITY_OPTIONS.map((option) => (
                    <button
                        key={option}
                        type="button"
                        data-visibility={option}
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
