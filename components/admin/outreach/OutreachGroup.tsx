import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

// One overview block: a title, the chart, and a sentence saying what it means.
export function OutreachGroup({ title, caption, children, className }: { title: string; caption?: string; children: ReactNode; className?: string }) {
    return (
        <section className={cn('min-w-0 rounded-xl border border-border bg-card p-4 sm:p-5', className)}>
            {/* Title */}
            <h2 className="mb-4 text-[11px] font-bold tracking-[0.14em] text-ink-faint uppercase">{title}</h2>

            {children}

            {/* Caption */}
            {caption && <p className="mt-4 text-sm leading-6 text-ink-muted">{caption}</p>}
        </section>
    );
}
