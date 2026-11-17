'use client';

import type { ChangeEvent } from 'react';

import { cn } from '@/lib/utils';

// A labelled pill row of radio options: the card's paper size, cards per page.
export function QrCardChoiceControl<T extends string>({
    name,
    legend,
    options,
    value,
    onChangeAction,
}: {
    name: string;
    legend: string;
    options: { value: T; label: string }[];
    value: T;
    onChangeAction: (event: ChangeEvent<HTMLInputElement>) => void;
}) {
    return (
        <fieldset>
            {/* Label */}
            <legend className="mb-2 text-sm font-semibold text-ink">{legend}</legend>
            {/* Options */}
            <div className="grid grid-cols-2 gap-1 rounded-full bg-surface-muted p-1">
                {options.map((option) => (
                    <label
                        key={option.value}
                        className={cn(
                            // relative: keeps the hidden radio inside the page's scroller, so focusing it can't scroll the app shell.
                            'relative flex min-h-10 cursor-pointer items-center justify-center rounded-full px-3 text-sm font-semibold transition-colors has-focus-visible:ring-2 has-focus-visible:ring-primary/30',
                            option.value === value ? 'bg-white text-ink shadow-sm' : 'text-ink-muted hover:text-ink',
                        )}
                    >
                        <input
                            type="radio"
                            name={name}
                            value={option.value}
                            checked={option.value === value}
                            onChange={onChangeAction}
                            className="sr-only"
                        />
                        {option.label}
                    </label>
                ))}
            </div>
        </fieldset>
    );
}
