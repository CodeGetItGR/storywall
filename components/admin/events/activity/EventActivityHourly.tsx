'use client';

import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import { EventActivityBarShape } from '@/components/admin/events/activity/EventActivityBarShape';
import { EventActivityColumnTotal } from '@/components/admin/events/activity/EventActivityColumnTotal';
import { EventActivityLegend } from '@/components/admin/events/activity/EventActivityLegend';
import { EventActivityTooltip } from '@/components/admin/events/activity/EventActivityTooltip';
import { useFunnelFormat } from '@/hooks/useFunnelFormat';
import { ACTIVITY_COLORS, ACTIVITY_KINDS, CHART_CURSOR, type HourColumn } from '@/lib/adminEventActivity';

const columnTitle = (row: object) => (row as HourColumn).label;

// One day, hour by hour, stacked by kind, with each hour's total above its column. The busiest hour
// is drawn at full strength with a bold total; the rest are a touch quieter.
export function EventActivityHourly({ columns, picker }: { columns: HourColumn[]; picker: ReactNode }) {
    const t = useTranslations('AdminPage.events.activity');
    const { count } = useFunnelFormat();
    const peak = Math.max(0, ...columns.map((column) => column.total));

    return (
        <section className="min-w-0 space-y-3">
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-ink">{t('hourly.title')}</h3>
                {picker}
            </div>
            {/* Legend */}
            <EventActivityLegend />
            {/* Chart */}
            <div role="img" aria-label={t('hourly.title')} className="h-56 min-w-0">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={columns} margin={{ top: 18, right: 4, left: -16, bottom: 0 }} barCategoryGap="22%">
                        <CartesianGrid stroke="var(--border)" vertical={false} />
                        <XAxis
                            dataKey="label"
                            tick={{ fill: 'var(--ink-faint)', fontSize: 11 }}
                            tickLine={false}
                            axisLine={false}
                            interval="preserveStartEnd"
                        />
                        <YAxis
                            allowDecimals={false}
                            tickFormatter={count}
                            tick={{ fill: 'var(--ink-faint)', fontSize: 11 }}
                            tickLine={false}
                            axisLine={false}
                        />
                        <Tooltip cursor={CHART_CURSOR} content={<EventActivityTooltip title={columnTitle} />} />
                        {ACTIVITY_KINDS.map((kind) => (
                            <Bar
                                key={kind}
                                dataKey={kind}
                                stackId="hour"
                                fill={ACTIVITY_COLORS[kind]}
                                maxBarSize={22}
                                isAnimationActive={false}
                                shape={<EventActivityBarShape kind={kind} peak={peak} />}
                            >
                                <LabelList
                                    dataKey="total"
                                    position="top"
                                    content={<EventActivityColumnTotal kind={kind} columns={columns} peak={peak} formatCount={count} />}
                                />
                            </Bar>
                        ))}
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </section>
    );
}
