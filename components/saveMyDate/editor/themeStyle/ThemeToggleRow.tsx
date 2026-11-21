'use client';

import { type ChangeEvent, useCallback, useId } from 'react';

type ThemeToggleRowProps = { label: string; checked: boolean; onChange: (checked: boolean) => void };

// A single on/off choice of the theme.
export function ThemeToggleRow({ label, checked, onChange }: ThemeToggleRowProps) {
    const id = useId();
    const change = useCallback((event: ChangeEvent<HTMLInputElement>) => onChange(event.target.checked), [onChange]);

    return (
        <label htmlFor={id} className="flex min-h-9 cursor-pointer items-center gap-2.5 text-[13px] leading-tight">
            <input id={id} type="checkbox" checked={checked} onChange={change} className="h-4 w-4 shrink-0 accent-(--smd-editor-accent)" />
            {label}
        </label>
    );
}
