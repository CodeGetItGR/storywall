import type { ReactNode } from 'react';

import { FunnelNote } from '@/components/admin/funnel/FunnelNote';
import { type FunnelWindow, FunnelWindowTag } from '@/components/admin/funnel/FunnelWindowTag';
import { cn } from '@/lib/utils';

// A dashboard section: same surface as the Metrics page groups, plus the date window it uses.
export function FunnelGroup({
    title,
    window,
    note,
    actions,
    children,
    className,
}: {
    title: string;
    window: FunnelWindow;
    note?: string;
    actions?: ReactNode;
    children: ReactNode;
    className?: string;
}) {
    return (
        <section className={cn('min-w-0 rounded-xl border border-border bg-card p-4 sm:p-5', className)}>
            {/* Title */}
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-[11px] font-bold tracking-[0.14em] text-ink-faint uppercase">{title}</h2>
                    <FunnelWindowTag window={window} />
                </div>
                {actions}
            </div>

            {children}

            {/* Caveat */}
            {note && <FunnelNote>{note}</FunnelNote>}
        </section>
    );
}
