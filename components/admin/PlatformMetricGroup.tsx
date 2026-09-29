import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

export function PlatformMetricGroup({ title, children, className }: { title: string; children: ReactNode; className?: string }) {
    return (
        <section className={cn('rounded-xl border border-border bg-card p-5', className)}>
            <h2 className="mb-4 text-[11px] font-bold tracking-[0.14em] text-ink-faint uppercase">{title}</h2>
            {children}
        </section>
    );
}
