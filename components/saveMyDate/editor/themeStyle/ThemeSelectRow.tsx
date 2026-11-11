'use client';

import { type ChangeEvent, useCallback, useId } from 'react';

import { SettingsSelect } from '@/components/saveMyDate/editor/settings/SettingsControls';

export type ThemeSelectOption = { value: string; label: string };

type ThemeSelectRowProps = {
    label: string;
    value: string;
    options: ThemeSelectOption[];
    onChange: (value: string) => void;
};

// A labelled list above its field: fonts and shapes have long names.
export function ThemeSelectRow({ label, value, options, onChange }: ThemeSelectRowProps) {
    const id = useId();
    const change = useCallback((event: ChangeEvent<HTMLSelectElement>) => onChange(event.target.value), [onChange]);

    return (
        <div className="flex flex-col gap-1.5">
            <label htmlFor={id} className="text-[13px] leading-tight">
                {label}
            </label>
            <SettingsSelect id={id} value={value} onChange={change}>
                {options.map((option) => (
                    <option key={option.value} value={option.value}>
                        {option.label}
                    </option>
                ))}
            </SettingsSelect>
        </div>
    );
}
