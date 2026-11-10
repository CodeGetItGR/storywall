'use client';

import { type MouseEvent } from 'react';

import { cn } from '@/lib/utils';

export type InvitationThemeSegmentedOption<T extends string> = { value: T; label: string };

// The console's slate segmented control: the list's filters and the drawer's status.
export function InvitationThemeSegmented<T extends string>({
    label,
    options,
    value,
    onChangeAction,
    fill = false,
}: {
    label: string;
    options: readonly InvitationThemeSegmentedOption<T>[];
    value: T;
    onChangeAction: (value: T) => void;
    // Stretches the options across the full width, as in a form.
    fill?: boolean;
}) {
    function handleClick(event: MouseEvent<HTMLButtonElement>) {
        const option = options[Number(event.currentTarget.dataset.index)];
        if (option) onChangeAction(option.value);
    }

    return (
        <div role="group" aria-label={label} className={cn('flex max-w-full flex-wrap gap-1 rounded-lg bg-canvas p-1', fill ? 'w-full' : 'w-fit')}>
            {options.map((option, index) => (
                <button
                    key={option.value}
                    type="button"
                    data-index={index}
                    onClick={handleClick}
                    aria-pressed={option.value === value}
                    className={cn(
                        'rounded-md px-2.5 py-1.5 text-[12.5px] font-bold transition-colors',
                        fill && 'flex-1',
                        option.value === value ? 'bg-card text-ink shadow-sm' : 'text-ink-faint hover:text-ink-muted',
                    )}
                >
                    {option.label}
                </button>
            ))}
        </div>
    );
}
