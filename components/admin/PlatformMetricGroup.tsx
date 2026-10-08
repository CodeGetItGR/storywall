import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

export function PlatformMetricGroup({
    title,
    children,
    className,
    titleAs: Title = 'h2',
}: {
    title: string;
    children: ReactNode;
    className?: string;
    // A group nested under a page section names itself one level down.
    titleAs?: 'h2' | 'h3' | 'h4';
}) {
    return (
        <section className={cn('rounded-xl border border-border bg-card p-5', className)}>
            <Title className="mb-4 text-[11px] font-bold tracking-[0.14em] text-ink-faint uppercase">{title}</Title>
            {children}
        </section>
    );
}
