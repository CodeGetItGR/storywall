'use client';

import type { ChangeEvent, ReactNode } from 'react';
import { useId } from 'react';

import { AdminField, adminInputClass } from '@/components/admin/AdminField';
import { ColorSwatch } from '@/components/ui/color/ColorSwatch';

// A colour picked from the circles or typed as hex.
export function QrCardLookColorField({
    name,
    label,
    hexLabel,
    value,
    swatchValue,
    hint,
    invalid,
    hintLive,
    onColorAction,
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
    onColorAction: (color: string) => void;
    onChangeAction: (event: ChangeEvent<HTMLInputElement>) => void;
    children?: ReactNode;
}) {
    const hintId = useId();
    const describedBy = hint ? hintId : undefined;

    return (
        <AdminField label={label} required hint={hint} hintId={hintId} hintLive={hintLive}>
            <div className="flex items-center gap-2">
                <ColorSwatch value={swatchValue} label={label} describedBy={describedBy} surface="light" onChange={onColorAction} />
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
