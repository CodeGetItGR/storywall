'use client';

import { useTranslations } from 'next-intl';
import { useCallback } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import { FunnelGroup } from '@/components/admin/funnel/FunnelGroup';
import { useFunnelFormat } from '@/hooks/useFunnelFormat';
import { hourLabel } from '@/lib/adminCampaignOverview';
import type { CampaignOverviewDto } from '@/lib/api/types';

// Visitors per Athens hour, for a range that is one day.
export function CampaignHourly({ hourly }: { hourly: CampaignOverviewDto['hourly'] }) {
    const t = useTranslations('AdminPage.campaignOverview.hourly');
    const format = useFunnelFormat();

    const formatTooltip = useCallback((value: unknown) => [format.count(Number(value)), t('visitors')], [format, t]);

    return (
        <FunnelGroup title={t('title')} window="visit">
            <div role="img" className="h-56 min-w-0" aria-label={t('title')}>
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={hourly} margin={{ top: 4, right: 8, left: -12, bottom: 0 }}>
                        <CartesianGrid stroke="var(--border)" vertical={false} />
                        <XAxis
                            dataKey="hour"
                            tickFormatter={hourLabel}
                            tick={{ fill: 'var(--ink-faint)', fontSize: 11 }}
                            tickLine={false}
                            axisLine={false}
                            minTickGap={8}
                        />
                        <YAxis
                            allowDecimals={false}
                            tickFormatter={format.count}
                            tick={{ fill: 'var(--ink-faint)', fontSize: 11 }}
                            tickLine={false}
                            axisLine={false}
                        />
                        <Tooltip labelFormatter={hourLabel} formatter={formatTooltip} cursor={{ fill: 'var(--surface-muted)' }} />
                        <Bar dataKey="visitors" fill="var(--ink-muted)" radius={[3, 3, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </FunnelGroup>
    );
}
