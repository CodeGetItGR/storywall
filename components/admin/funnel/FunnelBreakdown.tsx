'use client';

import { PlatformMetricBar } from '@/components/admin/PlatformMetricBar';
import { useFunnelFormat } from '@/hooks/useFunnelFormat';
import type { FunnelBreakdownRow } from '@/lib/adminFunnel';

// Rows of a keyed count map. Keys without a label are shown as the backend sent them.
export function FunnelBreakdown({ title, rows, labels }: { title: string; rows: FunnelBreakdownRow[]; labels?: Record<string, string> }) {
    const format = useFunnelFormat();

    return (
        <div className="min-w-0">
            <h3 className="mb-2 text-xs font-semibold text-ink-muted">{title}</h3>
            <ul className="space-y-2">
                {rows.map((row) => (
                    <li key={row.key} className="grid grid-cols-[minmax(0,9rem)_minmax(0,1fr)_auto] items-center gap-3">
                        <span className="truncate text-sm text-ink" title={row.key}>
                            {labels?.[row.key] ?? <span className="font-mono text-xs font-bold">{row.key}</span>}
                        </span>
                        <PlatformMetricBar ratio={row.ratio ?? 0} />
                        <span className="w-20 text-right text-sm tabular-nums">
                            <span className="font-bold text-ink">{format.count(row.value)}</span>
                            <span className="ml-1.5 text-xs text-ink-faint">{format.rate(row.ratio)}</span>
                        </span>
                    </li>
                ))}
            </ul>
        </div>
    );
}
