'use client';

import type { ReactNode } from 'react';

import { FormFieldLabel } from '@/components/ui/FormFieldLabel';
import { cn } from '@/lib/utils';

export function adminInputClass(className?: string): string {
    return cn(
        'min-h-10 rounded-md border border-border bg-white/80 px-3 py-2 text-sm leading-6 text-ink outline-none transition placeholder:text-ink-faint hover:border-ink-faint focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/15 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20',
        className
    );
}

export function AdminField({
    label,
    children,
    className,
    required,
    optional,
    hint,
}: {
    label: string;
    children: ReactNode;
    className?: string;
    required?: boolean;
    optional?: boolean;
    hint?: string;
}) {
    return (
        <FormFieldLabel
            label={label}
            className={cn('gap-0.5', className)}
            labelClassName="text-[11px] font-bold uppercase tracking-wide text-ink-muted"
            indicator={required ? 'required' : optional ? 'optional' : undefined}
        >
            {children}
            {hint && <span className="text-[11px] leading-4 text-ink-faint">{hint}</span>}
        </FormFieldLabel>
    );
}
