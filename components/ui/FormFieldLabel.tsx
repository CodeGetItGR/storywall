'use client';

import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

type FormFieldLabelIndicator = 'required' | 'optional';

interface FormFieldLabelProps {
    label: ReactNode;
    children: ReactNode;
    className?: string;
    labelClassName?: string;
    required?: boolean;
    optional?: boolean;
    indicator?: FormFieldLabelIndicator;
    indicatorClassName?: string;
}

export function FormFieldLabel({
    label,
    children,
    className,
    labelClassName,
    required,
    optional,
    indicator,
    indicatorClassName,
}: FormFieldLabelProps) {
    const t = useTranslations('Common');
    const resolvedIndicator = indicator ?? (required ? 'required' : optional ? 'optional' : undefined);

    return (
        <label className={cn('flex min-w-0 flex-col gap-1.5', className)}>
            <span className={cn('text-xs font-semibold uppercase tracking-wide text-ink-muted', labelClassName)}>
                <span>{label}</span>
                {resolvedIndicator && (
                    <span
                        aria-hidden="true"
                        className={cn(
                            resolvedIndicator === 'required'
                                ? 'ml-1 align-top text-[1.5em] font-medium text-ink-muted/80'
                                : 'ml-1 text-[20px] font-medium normal-case tracking-normal text-ink-faint',
                            indicatorClassName
                        )}
                    >
                        {resolvedIndicator === 'required' ? '*' : `(${t('optional')})`}
                    </span>
                )}
            </span>
            {children}
        </label>
    );
}
