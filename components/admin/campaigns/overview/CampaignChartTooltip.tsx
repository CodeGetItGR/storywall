'use client';

import { useFunnelFormat } from '@/hooks/useFunnelFormat';
import type { CampaignChartLine } from '@/lib/adminCampaignOverview';

type TooltipEntry = { dataKey?: unknown; value?: unknown };

// Every line's visitors at the hovered day or hour, biggest first. Text stays in ink; the swatch
// carries the line's color.
export function CampaignChartTooltip({
    active,
    payload,
    label,
    lines,
    lineName,
    lineColor,
    formatX,
}: {
    active?: boolean;
    payload?: readonly TooltipEntry[];
    label?: unknown;
    lines: CampaignChartLine[];
    lineName: (line: CampaignChartLine) => string;
    lineColor: (line: CampaignChartLine) => string;
    formatX: (value: unknown) => string;
}) {
    const format = useFunnelFormat();
    if (!active || !payload?.length) return null;

    const valueOf = new Map(payload.map((entry) => [String(entry.dataKey), Number(entry.value ?? 0)]));
    const items = lines.map((line) => ({ line, value: valueOf.get(line.dataKey) ?? 0 })).sort((left, right) => right.value - left.value);

    return (
        <div className="min-w-40 rounded-lg border border-border bg-card px-3 py-2 text-xs shadow-sm">
            {/* Day or hour */}
            <p className="mb-1.5 font-semibold text-ink">{formatX(label)}</p>
            {/* Lines */}
            <ul className="space-y-1">
                {items.map(({ line, value }) => (
                    <li key={line.dataKey} className="flex items-center gap-2">
                        <span aria-hidden="true" className="h-2 w-2 shrink-0 rounded-full" style={{ background: lineColor(line) }} />
                        <span className="min-w-0 flex-1 truncate font-mono text-ink-muted">{lineName(line)}</span>
                        <span className="font-mono font-semibold text-ink tabular-nums">{format.count(value)}</span>
                    </li>
                ))}
            </ul>
        </div>
    );
}
