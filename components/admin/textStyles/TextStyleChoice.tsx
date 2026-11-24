'use client';

import { type MouseEvent } from 'react';

import { cn } from '@/lib/utils';

export type TextStyleChoiceOption<T extends string> = { value: T; label: string };

// A two-option segmented control (Weight, Case). The chosen side is ink on white: coral stays for the primary action.
export function TextStyleChoice<T extends string>({
    label,
    options,
    value,
    onChangeAction,
}: {
    label: string;
    options: readonly TextStyleChoiceOption<T>[];
    value: T;
    onChangeAction: (value: T) => void;
}) {
    function handleClick(event: MouseEvent<HTMLButtonElement>) {
        const option = options[Number(event.currentTarget.dataset.index)];
        if (option) onChangeAction(option.value);
    }

    return (
        <div className="flex flex-col gap-1">
            <span className="text-[11px] font-bold tracking-wide text-ink-muted uppercase">{label}</span>
            <div role="group" aria-label={label} className="grid w-fit grid-flow-col gap-1 rounded-lg bg-canvas p-1">
                {options.map((option, index) => {
                    const active = option.value === value;
                    return (
                        <button
                            key={option.value}
                            type="button"
                            data-index={index}
                            aria-pressed={active}
                            onClick={handleClick}
                            className={cn(
                                'min-h-8 rounded-md px-3 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
                                active ? 'bg-card text-ink shadow-sm' : 'text-ink-muted hover:text-ink',
                            )}
                        >
                            {option.label}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
