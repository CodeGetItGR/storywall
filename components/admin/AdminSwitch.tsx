import type { ChangeEventHandler } from 'react';

import { cn } from '@/lib/utils';

export function AdminSwitch({
    name,
    label,
    description,
    defaultChecked,
    checked,
    onChange,
}: {
    name: string;
    label: string;
    description?: string;
    defaultChecked?: boolean;
    checked?: boolean;
    onChange?: ChangeEventHandler<HTMLInputElement>;
}) {
    return (
        <label className="group flex cursor-pointer items-center justify-between gap-3 py-1.5 transition">
            <span className="min-w-0">
                <span className="block text-xs font-semibold text-ink">{label}</span>
                {description && <span className="mt-0.5 block text-[11px] leading-snug text-ink-muted">{description}</span>}
            </span>
            <input type="checkbox" name={name} defaultChecked={defaultChecked} checked={checked} onChange={onChange} className="peer sr-only" />
            <span
                className={cn(
                    'h-5 w-9 shrink-0 rounded-full border border-border/60 bg-surface-muted p-0.5 transition after:block after:h-4 after:w-4 after:rounded-full after:bg-white after:shadow-sm after:transition',
                    'peer-checked:border-primary/30 peer-checked:bg-primary peer-checked:after:translate-x-4 peer-focus-visible:ring-2 peer-focus-visible:ring-primary/25'
                )}
            />
        </label>
    );
}
