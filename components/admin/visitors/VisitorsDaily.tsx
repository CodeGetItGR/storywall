'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useCallback } from 'react';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import { FunnelGroup } from '@/components/admin/funnel/FunnelGroup';
import { useFunnelFormat } from '@/hooks/useFunnelFormat';
import type { VisitorMetricsDto } from '@/lib/api/types';
import { formatDate } from '@/lib/datetime';

export function VisitorsDaily({ daily }: { daily: VisitorMetricsDto['daily'] }) {
    const t = useTranslations('AdminPage.visitors');
    const locale = useLocale();
    const format = useFunnelFormat();

    const formatDay = useCallback(
        (value: unknown) => formatDate(locale, String(value), { day: 'numeric', month: 'short', timeZone: 'UTC' }),
        [locale],
    );
    const formatTooltip = useCallback((value: unknown) => [format.count(Number(value)), t('daily.visitors')], [format, t]);

    return (
        <FunnelGroup title={t('daily.title')} window="visit">
            {daily.length === 0 ? (
                <p className="text-sm text-ink-muted">{t('empty')}</p>
            ) : (
                <div role="img" className="h-56 min-w-0" aria-label={t('daily.title')}>
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={daily} margin={{ top: 4, right: 8, left: -12, bottom: 0 }}>
                            <CartesianGrid stroke="var(--border)" vertical={false} />
                            <XAxis
                                dataKey="date"
                                tickFormatter={formatDay}
                                tick={{ fill: 'var(--ink-faint)', fontSize: 11 }}
                                tickLine={false}
                                axisLine={false}
                                minTickGap={16}
                            />
                            <YAxis
                                allowDecimals={false}
                                tickFormatter={format.count}
                                tick={{ fill: 'var(--ink-faint)', fontSize: 11 }}
                                tickLine={false}
                                axisLine={false}
                            />
                            <Tooltip labelFormatter={formatDay} formatter={formatTooltip} />
                            <Line type="monotone" dataKey="visitors" stroke="var(--ink-muted)" strokeWidth={2} dot={daily.length === 1} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            )}
        </FunnelGroup>
    );
}
