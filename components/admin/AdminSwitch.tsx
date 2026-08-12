import type { ChangeEventHandler } from 'react';

import { cn } from '@/lib/utils';

export function AdminSwitch({
    name,
    label,
    description,
    defaultChecked,
    checked,
    onChange,
    required,
    optional = true,
}: {
    name: string;
    label: string;
    description?: string;
    defaultChecked?: boolean;
    checked?: boolean;
    onChange?: ChangeEventHandler<HTMLInputElement>;
    required?: boolean;
    optional?: boolean;
}) {
    return (
        <label className="group flex min-h-12 cursor-pointer items-center justify-between gap-3 border-b border-border/70 py-2 transition last:border-b-0 hover:bg-surface-muted/45">
            <span className="min-w-0">
                <span className="block text-sm font-semibold text-ink">
                    <span>{label}</span>
                    {(required || optional) && (
                        <span className={cn('ml-1 text-[10px] font-medium', required ? 'text-ink-muted/80' : 'text-ink-faint')}>
                            {required ? '*' : '(optional)'}
                        </span>
                    )}
                </span>
                {description && <span className="mt-0.5 block text-[11px] leading-snug text-ink-muted">{description}</span>}
            </span>
            <input
                type="checkbox"
                name={name}
                value={name}
                defaultChecked={defaultChecked}
                checked={checked}
                onChange={onChange}
                className="peer sr-only"
            />
            <span
                className={cn(
                    'h-5 w-9 shrink-0 rounded-full border border-border/60 bg-surface-muted p-0.5 transition after:block after:h-4 after:w-4 after:rounded-full after:bg-white after:shadow-sm after:transition',
                    'peer-checked:border-primary/30 peer-checked:bg-primary peer-checked:after:translate-x-4 peer-focus-visible:ring-2 peer-focus-visible:ring-primary/25'
                )}
            />
        </label>
    );
}
