'use client';

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import { CampaignChartTooltip } from '@/components/admin/campaigns/overview/CampaignChartTooltip';
import { FunnelGroup } from '@/components/admin/funnel/FunnelGroup';
import { useCampaignVisitorsChart } from '@/hooks/useCampaignVisitorsChart';
import { useFunnelFormat } from '@/hooks/useFunnelFormat';
import type { CampaignOverviewDto } from '@/lib/api/types';

const axisTick = { fill: 'var(--ink-faint)', fontSize: 11 };

// Visitors per day, or per hour for a one-day range, a line per source (or per campaign of the picked
// source). One link's stats have a single total line.
export function CampaignVisitorsChart({ data }: { data: CampaignOverviewDto }) {
    const chart = useCampaignVisitorsChart(data);
    const format = useFunnelFormat();

    return (
        <FunnelGroup title={chart.title} window="visit">
            {/* Legend */}
            {chart.showLegend && (
                <ul className="mb-4 flex flex-wrap gap-x-4 gap-y-1.5">
                    {chart.lines.map((line) => (
                        <li key={line.dataKey} className="flex items-center gap-1.5 text-xs">
                            <span aria-hidden="true" className="h-0.5 w-3.5 rounded-full" style={{ background: chart.lineColor(line) }} />
                            <span className="font-mono text-ink">{chart.lineName(line)}</span>
                            <span className="text-ink-faint tabular-nums">{format.count(line.visitors)}</span>
                        </li>
                    ))}
                </ul>
            )}

            {/* Chart */}
            <div role="img" className="h-56 min-w-0" aria-label={chart.title}>
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chart.rows} margin={{ top: 4, right: 8, left: -12, bottom: 0 }}>
                        <CartesianGrid stroke="var(--border)" vertical={false} />
                        <XAxis dataKey="x" tickFormatter={chart.formatX} tick={axisTick} tickLine={false} axisLine={false} minTickGap={16} />
                        <YAxis allowDecimals={false} tickFormatter={format.count} tick={axisTick} tickLine={false} axisLine={false} />
                        <Tooltip
                            cursor={{ stroke: 'var(--ink-faint)', strokeDasharray: '3 3' }}
                            content={
                                <CampaignChartTooltip
                                    lines={chart.lines}
                                    lineName={chart.lineName}
                                    lineColor={chart.lineColor}
                                    formatX={chart.formatX}
                                />
                            }
                        />
                        {chart.lines.map((line) => (
                            <Line
                                key={line.dataKey}
                                type="linear"
                                dataKey={line.dataKey}
                                name={chart.lineName(line)}
                                stroke={chart.lineColor(line)}
                                strokeWidth={2}
                                dot={chart.rows.length === 1 ? { r: 4, strokeWidth: 2, fill: 'var(--card)' } : false}
                                activeDot={{ r: 4, strokeWidth: 2, stroke: 'var(--card)' }}
                                isAnimationActive={false}
                            />
                        ))}
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </FunnelGroup>
    );
}
