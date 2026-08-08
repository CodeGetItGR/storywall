'use client';

import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

export function adminInputClass(className?: string): string {
    return cn(
        'min-h-9 rounded-none border-0 border-b border-border bg-transparent px-0 py-1.5 text-sm leading-6 text-ink outline-none transition placeholder:text-ink-faint focus:border-primary focus:ring-0 focus-visible:border-primary focus-visible:ring-0',
        className
    );
}

export function AdminField({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
    return (
        <label className={cn('flex min-w-0 flex-col gap-0.5', className)}>
            <span className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">{label}</span>
            {children}
        </label>
    );
}
