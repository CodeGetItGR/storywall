import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

export function AdminSection({
    title,
    description,
    children,
    className,
}: {
    title: string;
    description?: string;
    children: ReactNode;
    className?: string;
}) {
    return (
        <section className={cn('border-t-2 border-border py-6 first:border-t-0 first:pt-0', className)}>
            <div className="mb-3 flex items-baseline gap-3">
                <p className="text-xs font-bold uppercase tracking-wide text-primary-dark">{title}</p>
                <span className="h-px min-w-8 flex-1 bg-border" />
            </div>
            {description && <p className="-mt-1 mb-4 max-w-2xl text-sm leading-6 text-ink-muted">{description}</p>}
            {children}
        </section>
    );
}
