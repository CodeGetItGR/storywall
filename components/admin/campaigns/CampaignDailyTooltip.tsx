'use client';

import { useCampaignFormat } from '@/hooks/useCampaignFormat';

type TooltipEntry = { dataKey?: unknown; value?: unknown };

const ROW = 'flex items-center justify-between gap-4';

// The hovered day's visitors, and the same day of the previous period's.
export function CampaignDailyTooltip({
    active,
    payload,
    label,
    currentName,
    previousName,
}: {
    active?: boolean;
    payload?: readonly TooltipEntry[];
    label?: unknown;
    currentName: string;
    previousName: string;
}) {
    const format = useCampaignFormat();
    if (!active || !payload?.length) return null;

    const valueOf = new Map(payload.map((entry) => [String(entry.dataKey), entry.value]));
    const previous = valueOf.get('previous');

    return (
        <div className="min-w-40 rounded-lg border border-border bg-card px-3 py-2 text-xs shadow-sm">
            {/* Day */}
            <p className="mb-1.5 font-semibold text-ink">{format.day(String(label))}</p>

            {/* Periods */}
            <dl className="space-y-1">
                <div className={ROW}>
                    <dt className="text-ink-muted">{currentName}</dt>
                    <dd className="font-mono font-semibold text-ink tabular-nums">{format.count(Number(valueOf.get('current') ?? 0))}</dd>
                </div>
                {previous !== undefined && previous !== null && (
                    <div className={ROW}>
                        <dt className="text-ink-muted">{previousName}</dt>
                        <dd className="font-mono text-ink-muted tabular-nums">{format.count(Number(previous))}</dd>
                    </div>
                )}
            </dl>
        </div>
    );
}
