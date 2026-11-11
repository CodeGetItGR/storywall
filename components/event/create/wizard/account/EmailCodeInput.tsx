'use client';

import type { ChangeEvent } from 'react';

import { EMAIL_CODE_LENGTH, onlyDigits } from '@/lib/emailCode';

type Props = {
    label: string;
    value: string;
    onChange: (value: string) => void;
    onComplete: (code: string) => void;
    disabled?: boolean;
    invalid?: boolean;
};

// Six boxes that act as one field: one real input over them, so paste and the phone's code
// suggestion fill all six at once. The sixth digit submits.
export function EmailCodeInput({ label, value, onChange, onComplete, disabled = false, invalid = false }: Props) {
    function handleChange(event: ChangeEvent<HTMLInputElement>) {
        const next = onlyDigits(event.target.value);
        onChange(next);
        if (next.length === EMAIL_CODE_LENGTH) onComplete(next);
    }

    return (
        <div className="relative">
            {/* Boxes */}
            <div aria-hidden="true" className="grid grid-cols-6 gap-2">
                {Array.from({ length: EMAIL_CODE_LENGTH }, (_, index) => (
                    <span
                        key={index}
                        data-testid="code-box"
                        className={`flex h-14 items-center justify-center rounded-2xl bg-[#fbf1e6] text-[22px] font-bold text-ink ${
                            invalid ? 'ring-2 ring-red-400' : index === value.length ? 'ring-2 ring-[#ff7a59]' : ''
                        }`}
                    >
                        {value[index] ?? ''}
                    </span>
                ))}
            </div>

            {/* Field */}
            <input
                aria-label={label}
                aria-invalid={invalid}
                autoComplete="one-time-code"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={EMAIL_CODE_LENGTH + 8}
                autoFocus
                disabled={disabled}
                value={value}
                onChange={handleChange}
                className="absolute inset-0 h-full w-full cursor-text opacity-0"
            />
        </div>
    );
}
