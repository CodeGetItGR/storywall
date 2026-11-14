'use client';

import { useTranslations } from 'next-intl';

import { useFunnelFormat } from '@/hooks/useFunnelFormat';
import { ACTIVITY_COLORS, ACTIVITY_KINDS, type ActivityKind } from '@/lib/adminEventActivity';

type Row = Record<ActivityKind, number> & { total: number };

// The hover breakdown for one column, shared by the hourly and daily charts.
export function EventActivityTooltip({ active, payload, title }: { active?: boolean; payload?: { payload: Row }[]; title: (row: Row) => string }) {
    const t = useTranslations('AdminPage.events.activity.series');
    const { count } = useFunnelFormat();
    const row = active ? payload?.[0]?.payload : undefined;
    if (!row) return null;
    return (
        <div className="rounded-lg border border-border bg-card px-3 py-2 text-xs shadow-sm">
            {/* Header */}
            <p className="mb-1 font-semibold text-ink">
                {title(row)} · {count(row.total)}
            </p>
            {/* Breakdown */}
            {ACTIVITY_KINDS.map((kind) => (
                <p key={kind} className="flex items-center justify-between gap-4 text-ink-muted">
                    <span className="flex items-center gap-1.5">
                        <span aria-hidden="true" className="h-2 w-2 rounded-[2px]" style={{ backgroundColor: ACTIVITY_COLORS[kind] }} />
                        {t(kind)}
                    </span>
                    <span className="tabular-nums">{count(row[kind])}</span>
                </p>
            ))}
        </div>
    );
}
