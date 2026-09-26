import { useTranslations } from 'next-intl';
import type { ComponentProps } from 'react';

import { cn } from '@/lib/utils';

export function Skeleton({ className, ...props }: ComponentProps<'div'>) {
    return (
        <div data-slot="skeleton" aria-hidden="true" className={cn('rounded-md bg-surface-muted motion-safe:animate-pulse', className)} {...props} />
    );
}

// Wraps a loading placeholder so assistive tech announces it once, instead of
// reading every decorative block inside it.
export function SkeletonStatus({ className, children, ...props }: ComponentProps<'div'>) {
    const t = useTranslations('Common');

    return (
        <div role="status" aria-label={t('loading')} aria-busy="true" className={className} {...props}>
            {children}
        </div>
    );
}
