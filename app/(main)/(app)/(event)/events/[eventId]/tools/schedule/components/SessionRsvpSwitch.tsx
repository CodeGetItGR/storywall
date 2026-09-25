'use client';

import { cn } from '@/lib/utils';

// Rendered as a button rather than a checkbox so it stays out of the
// session form's FormData, like the rest of the controlled fields.
export function SessionRsvpSwitch({ label, checked, onCheckedChangeAction }: { label: string; checked: boolean; onCheckedChangeAction: (next: boolean) => void }) {
    function handleClick() {
        onCheckedChangeAction(!checked);
    }

    return (
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            onClick={handleClick}
            className="flex min-h-12 w-full items-center justify-between gap-3 rounded-2xl border border-border/70 bg-background px-4 py-3 text-left transition hover:bg-surface-muted/45"
        >
            <span className="min-w-0 text-sm font-medium text-ink">{label}</span>
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
