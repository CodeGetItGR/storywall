'use client';

import { type MouseEvent } from 'react';

import { cn } from '@/lib/utils';

export type FunnelSegmentedOption<T extends string | number> = { value: T; label: string };

export function FunnelSegmented<T extends string | number>({
    label,
    options,
    value,
    onChangeAction,
}: {
    label: string;
    options: readonly FunnelSegmentedOption<T>[];
    value: T;
    onChangeAction: (value: T) => void;
}) {
    function handleClick(event: MouseEvent<HTMLButtonElement>) {
        const option = options[Number(event.currentTarget.dataset.index)];
        if (option) onChangeAction(option.value);
    }

    return (
        <div role="group" aria-label={label} className="inline-flex max-w-full flex-wrap gap-1 rounded-lg border border-border bg-card p-1">
            {options.map((option, index) => {
                const active = option.value === value;
                return (
                    <button
                        key={String(option.value)}
                        type="button"
                        data-index={index}
                        aria-pressed={active}
                        onClick={handleClick}
                        className={cn(
                            'min-h-9 rounded-md px-3 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
                            active ? 'bg-primary text-primary-foreground' : 'text-ink-muted hover:bg-surface-muted hover:text-ink',
                        )}
                    >
                        {option.label}
                    </button>
                );
            })}
        </div>
    );
}
