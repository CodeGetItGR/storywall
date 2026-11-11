'use client';

import { type ChangeEvent } from 'react';

import type { EventTypeOption } from '@/hooks/useInvitationThemesCatalog';

// The event types a font or font pairing is offered to. None checked means every type.
export function EventTypeChecklist({
    legend,
    hint,
    options,
    value,
    onChangeAction,
}: {
    legend: string;
    hint: string;
    options: EventTypeOption[];
    value: readonly string[];
    onChangeAction: (key: string, checked: boolean) => void;
}) {
    function handleChange(event: ChangeEvent<HTMLInputElement>) {
        onChangeAction(event.currentTarget.value, event.currentTarget.checked);
    }

    return (
        <fieldset>
            <legend className="text-[11px] font-bold tracking-wide text-ink-muted uppercase">{legend}</legend>
            <div className="mt-1.5 grid grid-cols-2 gap-1.5">
                {options.map((option) => (
                    <label key={option.key} className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-ink hover:bg-canvas">
                        <input
                            type="checkbox"
                            value={option.key}
                            checked={value.includes(option.key)}
                            onChange={handleChange}
                            className="h-4 w-4 accent-primary"
                        />
                        {option.label}
                    </label>
                ))}
            </div>
            <p className="mt-1 text-[11px] leading-4 text-ink-faint">{hint}</p>
        </fieldset>
    );
}
