import type { LucideIcon } from 'lucide-react';

import { formatCount } from '@/lib/format';

export function PlatformMetricTile({ label, value, icon: Icon }: { label: string; value: number; icon: LucideIcon }) {
    return (
        <div className="border-b border-border bg-surface-muted/35 px-4 py-4">
            <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-ink-muted">{label}</p>
                <Icon className="h-4 w-4 text-primary-dark" aria-hidden="true" />
            </div>
            <p className="mt-2 text-3xl font-bold tabular-nums tracking-tight text-ink">{formatCount(value)}</p>
        </div>
    );
}
