'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useCallback, useMemo } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import { monthLabel, trendListLabel } from '@/lib/business';
import { formatReachCount } from '@/lib/vendorReach';

// Views per month over the last six months. One series, so one color.
export function BusinessTrendChart({ trend }: { trend: { month: string; views: number }[] }) {
    const t = useTranslations('BusinessPage.insights');
    const locale = useLocale();
    const formatMonth = useCallback((value: unknown) => monthLabel(locale, String(value)), [locale]);
    const formatCount = useCallback((value: unknown) => formatReachCount(locale, Number(value)), [locale]);
    const formatTooltip = useCallback((value: unknown) => [formatCount(value), t('trendViews')], [formatCount, t]);
    // The bars are drawn for the eye only; a screen reader gets every month and its views in one label.
    const label = useMemo(
        () =>
            t('trendLabel', {
                values: trendListLabel(locale, trend, (month, views) => t('trendPoint', { month, views: formatReachCount(locale, views) })),
            }),
        [locale, t, trend],
    );

    return (
        <figure className="flex flex-col gap-2">
            {/* Title */}
            <figcaption className="text-sm font-semibold text-ink">{t('trendTitle')}</figcaption>

            {/* Chart */}
            <div role="img" aria-label={label} className="h-44 min-w-0">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={trend} accessibilityLayer={false} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
                        <CartesianGrid stroke="var(--border)" vertical={false} />
                        <XAxis
                            dataKey="month"
                            tickFormatter={formatMonth}
                            tick={{ fill: 'var(--ink-faint)', fontSize: 11 }}
                            tickLine={false}
                            axisLine={false}
                        />
                        <YAxis
                            allowDecimals={false}
                            domain={[0, (dataMax: number) => Math.max(dataMax, 4)]}
                            tickFormatter={formatCount}
                            tick={{ fill: 'var(--ink-faint)', fontSize: 11 }}
                            tickLine={false}
                            axisLine={false}
                        />
                        <Tooltip labelFormatter={formatMonth} formatter={formatTooltip} cursor={{ fill: 'var(--canvas)' }} />
                        <Bar dataKey="views" fill="var(--primary)" radius={[6, 6, 0, 0]} maxBarSize={36} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </figure>
    );
}
