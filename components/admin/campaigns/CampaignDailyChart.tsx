'use client';

import { useTranslations } from 'next-intl';
import { useMemo } from 'react';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import { CampaignDailyTooltip } from '@/components/admin/campaigns/CampaignDailyTooltip';
import { FunnelGroup } from '@/components/admin/funnel/FunnelGroup';
import { useCampaignFormat } from '@/hooks/useCampaignFormat';
import { type CampaignDailyRow, chartLabelDates } from '@/lib/campaignCompare';

const AXIS_TICK = { fill: 'var(--ink-faint)', fontSize: 11 };
const MARGIN = { top: 4, right: 8, left: -12, bottom: 0 };
const CURSOR = { stroke: 'var(--ink-faint)', strokeDasharray: '3 3' };
const ACTIVE_DOT = { r: 4, strokeWidth: 2, stroke: 'var(--card)' };
const SINGLE_DOT = { r: 4, strokeWidth: 2, fill: 'var(--card)' };

// Visitors per day, with the previous period's days dashed behind them.
export function CampaignDailyChart({ rows, hasPrevious }: { rows: CampaignDailyRow[]; hasPrevious: boolean }) {
    const t = useTranslations('AdminPage.campaigns.chart');
    const format = useCampaignFormat();
    const labelDates = useMemo(() => chartLabelDates(rows.map((row) => row.date)), [rows]);

    return (
        <FunnelGroup title={t('title')} window="visit">
            {/* Legend: only with something to tell apart */}
            {hasPrevious && (
                <ul className="mb-4 flex flex-wrap gap-x-4 gap-y-1.5 text-xs">
                    <li className="flex items-center gap-1.5">
                        <span aria-hidden="true" className="h-0.5 w-3.5 rounded-full bg-ink" />
                        <span className="text-ink">{t('current')}</span>
                    </li>
                    <li className="flex items-center gap-1.5">
                        <span aria-hidden="true" className="w-3.5 border-t-2 border-dashed border-ink-faint" />
                        <span className="text-ink-muted">{t('previous')}</span>
                    </li>
                </ul>
            )}

            {/* Chart */}
            <div role="img" aria-label={t('title')} className="h-56 min-w-0">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={rows} margin={MARGIN}>
                        <CartesianGrid stroke="var(--border)" vertical={false} />
                        <XAxis
                            dataKey="date"
                            ticks={labelDates}
                            interval={0}
                            tickFormatter={format.day}
                            tick={AXIS_TICK}
                            tickLine={false}
                            axisLine={false}
                        />
                        <YAxis allowDecimals={false} tickFormatter={format.count} tick={AXIS_TICK} tickLine={false} axisLine={false} />
                        <Tooltip cursor={CURSOR} content={<CampaignDailyTooltip currentName={t('current')} previousName={t('previous')} />} />
                        {hasPrevious && (
                            <Line
                                type="linear"
                                dataKey="previous"
                                name={t('previous')}
                                stroke="var(--ink-faint)"
                                strokeWidth={1.5}
                                strokeDasharray="4 4"
                                dot={false}
                                activeDot={false}
                                isAnimationActive={false}
                            />
                        )}
                        <Line
                            type="linear"
                            dataKey="current"
                            name={t('current')}
                            stroke="var(--ink)"
                            strokeWidth={2}
                            dot={rows.length === 1 ? SINGLE_DOT : false}
                            activeDot={ACTIVE_DOT}
                            isAnimationActive={false}
                        />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </FunnelGroup>
    );
}
