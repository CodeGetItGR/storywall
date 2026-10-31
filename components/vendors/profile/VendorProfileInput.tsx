'use client';

import type { ChangeEvent, HTMLAttributes } from 'react';
import { useCallback } from 'react';

import { FormFieldLabel } from '@/components/ui/FormFieldLabel';

export const VENDOR_INPUT_CLASS =
    'min-h-11 w-full rounded-2xl border border-border/70 bg-background px-4 text-sm text-ink transition outline-none placeholder:text-ink-faint focus:border-primary/40 focus:ring-4 focus:ring-primary/10';

// One labelled text field of the vendor profile sheet, with its error under it.
export function VendorProfileInput({
    label,
    value,
    error,
    maxLength,
    placeholder,
    required,
    optional,
    multiline,
    inputMode,
    autoComplete,
    type = 'text',
    onChangeAction,
}: {
    label: string;
    value: string;
    error?: string;
    maxLength: number;
    placeholder?: string;
    required?: boolean;
    optional?: boolean;
    multiline?: boolean;
    inputMode?: HTMLAttributes<HTMLInputElement>['inputMode'];
    autoComplete?: string;
    type?: 'text' | 'tel' | 'email';
    onChangeAction: (value: string) => void;
}) {
    const handleChange = useCallback(
        (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => onChangeAction(event.target.value),
        [onChangeAction],
    );

    return (
        <div>
            <FormFieldLabel label={label} required={required} optional={optional}>
                {multiline ? (
                    <textarea
                        className={`${VENDOR_INPUT_CLASS} min-h-20 resize-none py-3`}
                        value={value}
                        maxLength={maxLength}
                        placeholder={placeholder}
                        onChange={handleChange}
                        aria-invalid={Boolean(error)}
                        rows={2}
                    />
                ) : (
                    <input
                        className={VENDOR_INPUT_CLASS}
                        type={type}
                        value={value}
                        maxLength={maxLength}
                        placeholder={placeholder}
                        onChange={handleChange}
                        aria-invalid={Boolean(error)}
                        inputMode={inputMode}
                        autoComplete={autoComplete}
                    />
                )}
            </FormFieldLabel>
            {error && (
                <p role="alert" className="mt-1 text-xs text-red-600">
                    {error}
                </p>
            )}
        </div>
    );
}
