'use client';

import { useLocale, useTranslations } from 'next-intl';
import { Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import { EventActivityBarShape } from '@/components/admin/events/activity/EventActivityBarShape';
import { EventActivityColumnTotal } from '@/components/admin/events/activity/EventActivityColumnTotal';
import { EventActivityTooltip } from '@/components/admin/events/activity/EventActivityTooltip';
import { useFunnelFormat } from '@/hooks/useFunnelFormat';
import { ACTIVITY_COLORS, ACTIVITY_KINDS, type DayColumn, wallClockDate } from '@/lib/adminEventActivity';
import { formatDate } from '@/lib/datetime';

type LabelledDay = DayColumn & { label: string };
const columnTitle = (row: object) => (row as LabelledDay).label;

// Every day from the first to the last active one, with older days folded into one "earlier" column.
export function EventActivityDaily({ columns }: { columns: DayColumn[] }) {
    const t = useTranslations('AdminPage.events.activity');
    const locale = useLocale();
    const { count } = useFunnelFormat();
    const data: LabelledDay[] = columns.map((column) => ({
        ...column,
        label: column.earlier
            ? t('daily.earlier')
            : formatDate(locale, wallClockDate(column.day), { weekday: 'short', day: 'numeric', timeZone: 'UTC' }),
    }));

    return (
        <section className="min-w-0 space-y-3">
            {/* Header */}
            <h3 className="text-sm font-semibold text-ink">{t('daily.title')}</h3>
            {/* Chart */}
            <div role="img" aria-label={t('daily.title')} className="h-40 min-w-0">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data} margin={{ top: 18, right: 4, left: -16, bottom: 0 }} barCategoryGap="28%">
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
                        <Tooltip cursor={{ fill: 'var(--canvas)' }} content={<EventActivityTooltip title={columnTitle} />} />
                        {ACTIVITY_KINDS.map((kind) => (
                            <Bar
                                key={kind}
                                dataKey={kind}
                                stackId="day"
                                fill={ACTIVITY_COLORS[kind]}
                                maxBarSize={22}
                                isAnimationActive={false}
                                shape={<EventActivityBarShape kind={kind} />}
                            >
                                <LabelList
                                    dataKey="total"
                                    position="top"
                                    content={<EventActivityColumnTotal kind={kind} columns={data} formatCount={count} />}
                                />
                            </Bar>
                        ))}
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </section>
    );
}
