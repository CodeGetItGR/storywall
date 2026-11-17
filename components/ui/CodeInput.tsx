'use client';

import type { ChangeEvent } from 'react';

import { onlyDigits } from '@/lib/emailCode';

export type CodeInputTone = 'cream' | 'muted';

type Props = {
    length: number;
    value: string;
    onChange: (value: string) => void;
    // Called with the full code once the last digit is in; leave it out to wait for a button.
    onComplete?: (code: string) => void;
    // Leave it out when a <label> around the field already names it.
    label?: string;
    describedBy?: string;
    disabled?: boolean;
    invalid?: boolean;
    autoFocus?: boolean;
    tone?: CodeInputTone;
};

const BOX_TONE: Record<CodeInputTone, string> = {
    // The account wizard's boxes.
    cream: 'h-14 rounded-2xl bg-[#fbf1e6] text-[22px] font-bold',
    // Matches the app's grey fields.
    muted: 'h-12 max-w-14 rounded-xl bg-surface-muted text-xl font-semibold',
};

// The box the next digit goes into, outlined while the field has focus.
const NEXT_BOX = 'group-focus-within:ring-[1.5px] group-focus-within:ring-ink';

// One box per digit that acts as one field: one real input over them, so paste and the phone's
// code suggestion fill every box at once.
export function CodeInput({
    length,
    value,
    onChange,
    onComplete,
    label,
    describedBy,
    disabled = false,
    invalid = false,
    autoFocus = false,
    tone = 'muted',
}: Props) {

    function handleChange(event: ChangeEvent<HTMLInputElement>) {
        const next = onlyDigits(event.target.value, length);
        onChange(next);
        if (next.length === length) onComplete?.(next);
    }

    return (
        <div className="group relative">
            {/* Boxes */}
            <div aria-hidden="true" className="flex gap-2">
                {Array.from({ length }, (_, index) => (
                    <span
                        key={index}
                        data-testid="code-box"
                        className={`flex min-w-0 flex-1 items-center justify-center text-ink ${BOX_TONE[tone]} ${
                            index === value.length ? NEXT_BOX : ''
                        } ${disabled ? 'opacity-60' : ''}`}
                    >
                        {value[index] ?? ''}
                    </span>
                ))}
            </div>

            {/* Field */}
            <input
                aria-label={label}
                aria-invalid={invalid}
                aria-describedby={describedBy}
                autoComplete="one-time-code"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={length + 8}
                autoFocus={autoFocus}
                disabled={disabled}
                value={value}
                onChange={handleChange}
                className="absolute inset-0 h-full w-full cursor-text opacity-0"
            />
        </div>
    );
}
