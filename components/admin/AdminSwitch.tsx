'use client';

import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

// A controlled switch row: label and supporting text on the left, the switch on
// the right. Rendered as a button rather than a checkbox so it can sit inside a
// form without contributing to that form's FormData.
export function AdminSwitch({
    label,
    description,
    badge,
    checked,
    disabled = false,
    onCheckedChangeAction,
}: {
    label: string;
    description?: ReactNode;
    badge?: ReactNode;
    checked: boolean;
    disabled?: boolean;
    onCheckedChangeAction: (next: boolean) => void;
}) {
    function handleClick() {
        onCheckedChangeAction(!checked);
    }

    return (
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            disabled={disabled}
            onClick={handleClick}
            className={cn(
                'flex min-h-12 w-full items-center justify-between gap-3 border-b border-border/70 px-3 py-2 text-left transition last:border-b-0',
                disabled ? 'cursor-not-allowed opacity-55' : 'cursor-pointer hover:bg-surface-muted/45',
            )}
        >
            <span className="min-w-0">
                <span className="flex items-center gap-2">
                    <span className={cn('truncate text-sm font-semibold', checked ? 'text-ink' : 'text-ink-muted')}>{label}</span>
                    {badge}
                </span>
                {description && <span className="mt-0.5 block text-[11px] leading-snug text-ink-faint">{description}</span>}
            </span>
            <span
                className={cn(
                    'h-5 w-9 shrink-0 rounded-full border p-0.5 transition',
                    checked ? 'border-primary/30 bg-primary' : 'border-border/60 bg-surface-muted',
                )}
            >
                <span className={cn('block h-4 w-4 rounded-full bg-white shadow-sm transition', checked && 'translate-x-4')} />
            </span>
        </button>
    );
}
