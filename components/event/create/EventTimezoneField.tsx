'use client';

import { Search } from 'lucide-react';
import { type ChangeEvent, useId } from 'react';

import { FormFieldLabel } from '@/components/ui/FormFieldLabel';

type EventTimezoneFieldProps = {
    label: string;
    value: string;
    options: string[];
    error?: string | null;
    onChangeAction: (event: ChangeEvent<HTMLInputElement>) => void;
};

export function EventTimezoneField({ label, value, options, error, onChangeAction }: EventTimezoneFieldProps) {
    const listId = useId();

    return (
        <FormFieldLabel label={label} required>
            <span className="relative">
                <input
                    type="text"
                    required
                    list={listId}
                    value={value}
                    onChange={onChangeAction}
                    aria-invalid={Boolean(error)}
                    autoComplete="off"
                    className="w-full rounded-xl bg-surface-muted py-3 pr-12 pl-4 text-sm text-ink outline-none transition placeholder:text-ink-faint focus:ring-2 focus:ring-primary/30"
                />
                <Search aria-hidden="true" className="pointer-events-none absolute top-1/2 right-4 h-4 w-4 -translate-y-1/2 text-ink-muted" />
            </span>
            <datalist id={listId}>
                {options.map((option) => (
                    <option key={option} value={option} />
                ))}
            </datalist>
            {error && <span className="text-xs text-rose-500">{error}</span>}
        </FormFieldLabel>
    );
}
