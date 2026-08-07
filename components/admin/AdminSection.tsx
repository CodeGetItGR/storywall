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
        <section className={cn('py-3 first:pt-0', className)}>
            <div className="mb-2">
                <p className="text-xs font-bold uppercase tracking-wide text-primary-dark">{title}</p>
                {description && <p className="mt-0.5 text-sm text-ink-muted">{description}</p>}
            </div>
            {children}
        </section>
    );
}
