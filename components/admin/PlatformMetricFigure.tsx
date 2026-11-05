import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

export function PlatformMetricFigure({
    label,
    value,
    hint,
    size = 'md',
    mono = false,
    info,
}: {
    label: string;
    value: string;
    hint?: string;
    size?: 'md' | 'lg';
    mono?: boolean;
    /** Sits beside the label, e.g. an info tip. */
    info?: ReactNode;
}) {
    return (
        <div className="min-w-0">
            <p className={cn('text-xs font-semibold text-ink-muted', info && 'flex items-center gap-1.5')}>
                {label}
                {info}
            </p>
            <p className={cn('mt-1 font-bold tracking-tight text-ink tabular-nums', size === 'lg' ? 'text-3xl' : 'text-lg', mono && 'font-mono')}>
                {value}
            </p>
            {hint && <p className="mt-0.5 text-xs text-ink-faint">{hint}</p>}
        </div>
    );
}
