'use client';

import { useTranslations } from 'next-intl';

import { useFunnelFormat } from '@/hooks/useFunnelFormat';
import { type ActivityKind, heatColor, hourLabel } from '@/lib/adminEventActivity';
import { cn } from '@/lib/utils';

const AXIS = [0, 6, 12, 18, 23];
const ROW = 'grid grid-cols-[4.5rem_repeat(24,minmax(0,1fr))] items-center gap-[3px]';

// Hour of day against kind, summed over every day: when guests were busiest. One blue ramp.
export function EventActivityHeatmap({ heatmap, kinds }: { heatmap: Record<ActivityKind, number[]>; kinds: ActivityKind[] }) {
    const t = useTranslations('AdminPage.events.activity');
    const { count } = useFunnelFormat();
    const max = Math.max(...kinds.flatMap((kind) => heatmap[kind]));

    return (
        <section className="min-w-0 space-y-3">
            {/* Header */}
            <h3 className="text-sm font-semibold text-ink">{t('heatmap.title')}</h3>
            {/* Grid */}
            <div className="space-y-[3px]">
                {kinds.map((kind) => (
                    <div key={kind} className={ROW}>
                        <span className="truncate text-[11px] text-ink-muted">{t(`series.${kind}`)}</span>
                        {heatmap[kind].map((value, hour) => {
                            const label = t('heatmap.cell', { kind: t(`series.${kind}`), hour: hourLabel(hour), count: count(value) });
                            return (
                                <span
                                    key={hour}
                                    role="img"
                                    aria-label={label}
                                    title={label}
                                    className="h-4 rounded-[3px] bg-border"
                                    style={value > 0 ? { backgroundColor: heatColor(value, max) } : undefined}
                                />
                            );
                        })}
                    </div>
                ))}
                {/* Axis */}
                <div aria-hidden="true" className={cn(ROW, 'text-[11px] text-ink-faint')}>
                    <span />
                    {Array.from({ length: 24 }, (_, hour) => (
                        <span key={hour} className="text-center">
                            {AXIS.includes(hour) ? String(hour).padStart(2, '0') : ''}
                        </span>
                    ))}
                </div>
            </div>
        </section>
    );
}
