import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

// One titled group on the order page. Every group gets the same frame so the
// eye can find a section by position and heading alone.
export function OrderCard({ title, children, className }: { title: string; children: ReactNode; className?: string }) {
    return (
        <section className={cn('rounded-xl border border-border bg-card p-5', className)}>
            <h2 className="mb-3 text-xs font-bold tracking-wide text-ink-faint uppercase">{title}</h2>
            {children}
        </section>
    );
}
