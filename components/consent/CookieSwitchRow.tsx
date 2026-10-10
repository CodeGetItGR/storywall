'use client';

import { cn } from '@/lib/utils';

// One cookie category: name and what it does on the left, the switch on the right.
export function CookieSwitchRow({
    label,
    description,
    checked,
    disabled = false,
    onCheckedChange,
}: {
    label: string;
    description: string;
    checked: boolean;
    disabled?: boolean;
    onCheckedChange?: (next: boolean) => void;
}) {
    function handleClick() {
        onCheckedChange?.(!checked);
    }

    return (
        <button
            aria-checked={checked}
            className={cn(
                'flex min-h-14 w-full items-center justify-between gap-4 py-3 text-left focus-ring',
                disabled ? 'cursor-not-allowed' : 'cursor-pointer',
            )}
            disabled={disabled}
            onClick={handleClick}
            role="switch"
            type="button"
        >
            <span className="min-w-0">
                <span className="block text-sm font-semibold text-ink">{label}</span>
                <span className="mt-0.5 block text-xs leading-snug text-ink-muted">{description}</span>
            </span>
            <span
                className={cn(
                    'h-6 w-10 shrink-0 rounded-full p-0.5 transition-colors',
                    checked ? 'bg-ink' : 'bg-surface-muted',
                    disabled && 'opacity-50',
                )}
            >
                <span className={cn('block size-5 rounded-full bg-white shadow-sm transition-transform', checked && 'translate-x-4')} />
            </span>
        </button>
    );
}
