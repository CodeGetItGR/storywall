'use client';

import { useLocale, useTranslations } from 'next-intl';
import { type ReactNode } from 'react';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { NameType, ValueType } from 'recharts/types/component/DefaultTooltipContent';

import { AdminSection } from '@/components/admin/AdminSection';
import type { TimelineChartRow } from '@/lib/costTracking';
import { formatDate } from '@/lib/datetime';
import { formatCount } from '@/lib/format';

const PLAN_COLORS = ['#5b6172', '#7b8394', '#9aa0b1', '#ccd1db'];

export function CostTrackingTrends({ data, planTiers }: { data: TimelineChartRow[]; planTiers: string[] }) {
    const locale = useLocale();
    const t = useTranslations('AdminPage.costTracking');

    function formatWeek(value: string) {
        return formatDate(locale, value, { day: 'numeric', month: 'short' });
    }

    function formatWeekWithYear(value: ReactNode) {
        return formatDate(locale, String(value), { day: 'numeric', month: 'short', year: 'numeric' });
    }

    function formatVolumeTooltip(value: ValueType | undefined, name: NameType | undefined) {
        return [formatCount(Number(value)), String(name ?? '')];
    }

    return (
        <AdminSection title={t('trends.title')} description={t('trends.description')}>
            {planTiers.length === 0 ? (
                <p className="text-sm text-ink-muted">{t('trends.empty')}</p>
            ) : (
                <div className="h-64 min-w-0" aria-label={t('trends.volume')}>
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                            <CartesianGrid stroke="var(--border)" vertical={false} />
                            <XAxis
                                dataKey="weekStart"
                                tickFormatter={formatWeek}
                                tick={{ fill: 'var(--ink-faint)', fontSize: 11 }}
                                tickLine={false}
                                axisLine={false}
                            />
                            <YAxis
                                allowDecimals={false}
                                tickFormatter={formatCount}
                                tick={{ fill: 'var(--ink-faint)', fontSize: 11 }}
                                tickLine={false}
                                axisLine={false}
                            />
                            <Tooltip formatter={formatVolumeTooltip} labelFormatter={formatWeekWithYear} />
                            <Legend wrapperStyle={{ fontSize: 12 }} />
                            {planTiers.map((planTierCode, index) => (
                                <Bar key={planTierCode} dataKey={planTierCode} stackId="events" fill={PLAN_COLORS[index % PLAN_COLORS.length]} />
                            ))}
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            )}
        </AdminSection>
    );
}
