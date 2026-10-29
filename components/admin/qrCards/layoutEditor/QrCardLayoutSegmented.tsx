'use client';

import type { ChangeEvent, ReactNode } from 'react';

import { cn } from '@/lib/utils';

// A small radio group drawn as one pill: the editor's alignment and sample switches.
export function QrCardLayoutSegmented<T extends string>({
    name,
    legend,
    value,
    options,
    onChangeAction,
}: {
    name: string;
    legend: string;
    value: T;
    options: Array<{ value: T; label: string; icon?: ReactNode }>;
    onChangeAction: (event: ChangeEvent<HTMLInputElement>) => void;
}) {
    return (
        <fieldset>
            {/* Legend */}
            <legend className="mb-1.5 text-[11px] font-bold tracking-wide text-ink-muted uppercase">{legend}</legend>
            {/* Options */}
            <div className="inline-flex rounded-md bg-canvas p-0.5">
                {options.map((option) => (
                    <label
                        key={option.value}
                        title={option.icon ? option.label : undefined}
                        className={cn(
                            'flex h-8 min-w-8 cursor-pointer items-center justify-center gap-1.5 rounded px-2.5 text-xs font-semibold has-focus-visible:ring-2 has-focus-visible:ring-primary/30',
                            option.value === value ? 'bg-card text-ink shadow-sm' : 'text-ink-muted hover:text-ink',
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
                        {option.icon}
                        <span className={option.icon ? 'sr-only' : undefined}>{option.label}</span>
                    </label>
                ))}
            </div>
        </fieldset>
    );
}
