'use client';

import { useCallback, useId } from 'react';

import { cn } from '@/lib/utils';

export type SettingsChoice<T extends string> = { value: T; label: string };

type SettingsChoicesProps<T extends string> = {
    label: string;
    choices: readonly SettingsChoice<T>[];
    value: T;
    onChange: (value: T) => void;
    columns?: 2 | 3;
};

// One of a few named options, all in view: a layout, a language, a position.
export function SettingsChoices<T extends string>({ label, choices, value, onChange, columns = 2 }: SettingsChoicesProps<T>) {
    const labelId = useId();

    return (
        <div className="flex flex-col gap-1.5">
            <span id={labelId} className="text-[13px] leading-tight">
                {label}
            </span>
            <div
                role="radiogroup"
                aria-labelledby={labelId}
                className={cn('grid gap-1 rounded-[10px] bg-(--smd-editor-control) p-1', columns === 3 ? 'grid-cols-3' : 'grid-cols-2')}
            >
                {choices.map((choice) => (
                    <Choice key={choice.value} choice={choice} isSelected={choice.value === value} onChange={onChange} />
                ))}
            </div>
        </div>
    );
}

type ChoiceProps<T extends string> = { choice: SettingsChoice<T>; isSelected: boolean; onChange: (value: T) => void };

function Choice<T extends string>({ choice, isSelected, onChange }: ChoiceProps<T>) {
    const pick = useCallback(() => onChange(choice.value), [choice.value, onChange]);

    return (
        <button
            type="button"
            role="radio"
            aria-checked={isSelected}
            onClick={pick}
            className="min-h-9 rounded-lg px-1.5 py-1 text-[12.5px] leading-tight font-semibold text-(--smd-editor-muted) hover:text-(--smd-editor-text) focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none aria-checked:bg-white aria-checked:text-[#232327]"
        >
            {choice.label}
        </button>
    );
}
