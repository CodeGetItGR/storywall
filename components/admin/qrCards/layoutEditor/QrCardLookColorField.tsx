'use client';

import type { ChangeEvent, ReactNode } from 'react';
import { useId } from 'react';

import { AdminField, adminInputClass } from '@/components/admin/AdminField';

const SWATCH_CLASS = 'h-10 w-12 shrink-0 cursor-pointer rounded-md border border-border bg-white p-1';

// A colour picked from a swatch or typed as hex, both named `name` so one handler takes either.
export function QrCardLookColorField({
    name,
    label,
    hexLabel,
    value,
    swatchValue,
    hint,
    invalid,
    hintLive,
    onChangeAction,
    children,
}: {
    name: string;
    label: string;
    hexLabel: string;
    value: string;
    swatchValue: string;
    hint?: string;
    invalid: boolean;
    hintLive?: boolean;
    onChangeAction: (event: ChangeEvent<HTMLInputElement>) => void;
    children?: ReactNode;
}) {
    const hintId = useId();
    const describedBy = hint ? hintId : undefined;

    return (
        <AdminField label={label} required hint={hint} hintId={hintId} hintLive={hintLive}>
            <div className="flex items-center gap-2">
                <input
                    type="color"
                    name={name}
                    value={swatchValue}
                    onChange={onChangeAction}
                    aria-label={label}
                    aria-describedby={describedBy}
                    className={SWATCH_CLASS}
                />
                <input
                    name={name}
                    value={value}
                    onChange={onChangeAction}
                    maxLength={7}
                    aria-label={hexLabel}
                    aria-describedby={describedBy}
                    aria-invalid={invalid}
                    className={adminInputClass('font-mono uppercase')}
                />
            </div>
            {children}
        </AdminField>
    );
}
