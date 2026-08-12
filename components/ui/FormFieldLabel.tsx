'use client';

import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

type FormFieldLabelIndicator = 'required' | 'optional';

interface FormFieldLabelProps {
    label: ReactNode;
    children: ReactNode;
    className?: string;
    labelClassName?: string;
    indicator?: FormFieldLabelIndicator;
    indicatorClassName?: string;
}

export function FormFieldLabel({ label, children, className, labelClassName, indicator, indicatorClassName }: FormFieldLabelProps) {
    return (
        <label className={cn('flex min-w-0 flex-col gap-1.5', className)}>
            <span className={cn('text-xs font-semibold uppercase tracking-wide text-ink-muted', labelClassName)}>
                <span>{label}</span>
                {indicator && (
                    <span
                        aria-hidden="true"
                        className={cn(
                            indicator === 'required'
                                ? 'ml-1 align-top text-[0.7em] font-medium text-ink-muted/80'
                                : 'ml-1 text-[10px] font-medium normal-case tracking-normal text-ink-faint',
                            indicatorClassName
                        )}
                    >
                        {indicator === 'required' ? '*' : '(optional)'}
                    </span>
                )}
            </span>
            {children}
        </label>
    );
}
