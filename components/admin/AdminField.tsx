'use client';

import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

export function adminInputClass(className?: string): string {
    return cn(
        'min-h-10 rounded-md border border-border bg-white/80 px-3 py-2 text-sm leading-6 text-ink outline-none transition placeholder:text-ink-faint hover:border-ink-faint focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/15 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20',
        className
    );
}

export function AdminField({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
    return (
        <label className={cn('flex min-w-0 flex-col gap-0.5', className)}>
            <span className="text-[11px] font-bold uppercase tracking-wide text-ink-muted">{label}</span>
            {children}
        </label>
    );
}
