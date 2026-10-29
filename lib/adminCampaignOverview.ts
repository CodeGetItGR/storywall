import { funnelBreakdown, type FunnelBreakdownRow, rateOf } from '@/lib/adminFunnel';
import type { CampaignOverviewDto, CampaignRowDto } from '@/lib/api/types';

export type CampaignFunnelKey = 'visits' | 'visitors' | 'createClicks' | 'plansClicks' | 'planPicks' | 'signedUp' | 'paidHost';

export type CampaignFunnelTile = { key: CampaignFunnelKey; value: number; share: number | null };

const FUNNEL_KEYS: readonly CampaignFunnelKey[] = ['visits', 'visitors', 'createClicks', 'plansClicks', 'planPicks', 'signedUp', 'paidHost'];

// Every step after Visitors also shows its share of visitors.
const SHARE_OF_VISITORS = new Set<CampaignFunnelKey>(['createClicks', 'plansClicks', 'planPicks', 'signedUp', 'paidHost']);

export function campaignFunnelTiles(data: CampaignOverviewDto): CampaignFunnelTile[] {
    return FUNNEL_KEYS.map((key) => ({
        key,
        value: data[key],
        share: SHARE_OF_VISITORS.has(key) ? rateOf(data[key], data.visitors) : null,
    }));
}

export type CampaignCounts = Pick<
    CampaignRowDto,
    'visits' | 'visitors' | 'createClicks' | 'plansClicks' | 'planPicks' | 'signedUp' | 'paidHost' | 'revenueMinorByCurrency'
>;

export type CampaignSourceGroup = { source: string; totals: CampaignCounts; rows: CampaignRowDto[] };

// The rows the overview adds up (Spring's CampaignOverviewService): a saved link or a visit.
function inOverview(row: CampaignRowDto): row is CampaignRowDto & { utmSource: string } {
    return row.utmSource !== null && (row.link !== null || row.visits > 0);
}

function addUp(rows: CampaignRowDto[]): CampaignCounts {
    const totals: CampaignCounts = {
        visits: 0,
        visitors: 0,
        createClicks: 0,
        plansClicks: 0,
        planPicks: 0,
        signedUp: 0,
        paidHost: 0,
        revenueMinorByCurrency: {},
    };
    for (const row of rows) {
        totals.visits += row.visits;
        totals.visitors += row.visitors;
        totals.createClicks += row.createClicks;
        totals.plansClicks += row.plansClicks;
        totals.planPicks += row.planPicks;
        totals.signedUp += row.signedUp;
        totals.paidHost += row.paidHost;
        for (const [currency, minor] of Object.entries(row.revenueMinorByCurrency)) {
            totals.revenueMinorByCurrency[currency] = (totals.revenueMinorByCurrency[currency] ?? 0) + minor;
        }
    }
    return totals;
}

// The overview's rows per utm source, most visits first; each source keeps the report's row order.
export function campaignSourceGroups(rows: CampaignRowDto[]): CampaignSourceGroup[] {
    const bySource = new Map<string, CampaignRowDto[]>();
    for (const row of rows.filter(inOverview)) {
        bySource.set(row.utmSource, [...(bySource.get(row.utmSource) ?? []), row]);
    }
    return [...bySource.entries()]
        .map(([source, sourceRows]) => ({ source, totals: addUp(sourceRows), rows: sourceRows }))
        .sort(
            (left, right) =>
                right.totals.visits - left.totals.visits || right.totals.signedUp - left.totals.signedUp || left.source.localeCompare(right.source),
        );
}

// The sources to pick from, plus the picked one when the range has nothing for it.
export function campaignSourceOptions(groups: CampaignSourceGroup[], picked: string | null): string[] {
    const sources = groups.map((group) => group.source);
    return picked && !sources.includes(picked) ? [picked, ...sources] : sources;
}

// The single day the range covers shows visitors per hour instead of one point.
export function showsHourly(data: CampaignOverviewDto): boolean {
    return data.daily.length === 1 && data.hourly.length > 0;
}

// Hour 9 as "09:00", Athens time like the rest of the overview.
export function hourLabel(hour: unknown): string {
    return `${String(hour).padStart(2, '0')}:00`;
}

// The key for old visits whose link is gone; real pages always start with "/".
export const UNKNOWN_PAGE = '';

export function pageRows(pages: CampaignOverviewDto['pages']): FunnelBreakdownRow[] {
    return funnelBreakdown(Object.fromEntries(pages.map((row) => [row.page ?? UNKNOWN_PAGE, row.visits])));
}

// The chart has a color per line; past that, the smallest lines add up into one "Other" line.
export const CHART_SLOTS = 8;

export type CampaignChartLine = {
    // The row field holding the line's values. Series names can hold dots, which recharts reads as paths.
    dataKey: string;
    // The source or "medium / campaign"; null for the single total line or "Other".
    series: string | null;
    other: boolean;
    // The line's palette slot, by name, so a line keeps its color when another one comes or goes; -1 for "Other".
    slot: number;
    visitors: number;
};

export type CampaignChart = { lines: CampaignChartLine[]; rows: Record<string, string | number>[] };

// Visitors per day (or per hour for a one-day range) as chart rows, a line per series, biggest first.
// Without series (one link) it is the single total line.
export function campaignVisitorsChart(data: CampaignOverviewDto, hourly: boolean): CampaignChart {
    const xs: (string | number)[] = hourly ? data.hourly.map((row) => row.hour) : data.daily.map((row) => row.date);
    const points = hourly
        ? data.hourlySeries.map((row) => ({ series: row.series, x: row.hour as string | number, visitors: row.visitors }))
        : data.dailySeries.map((row) => ({ series: row.series, x: row.date as string | number, visitors: row.visitors }));
    const totals = hourly ? data.hourly : data.daily;

    if (points.length === 0) {
        return {
            lines: [{ dataKey: 'total', series: null, other: false, slot: 0, visitors: totals.reduce((sum, row) => sum + row.visitors, 0) }],
            rows: totals.map((row, index) => ({ x: xs[index], total: row.visitors })),
        };
    }

    const bySeries = new Map<string, number>();
    for (const point of points) bySeries.set(point.series, (bySeries.get(point.series) ?? 0) + point.visitors);
    const ranked = [...bySeries.entries()].sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]));
    const kept = ranked.length > CHART_SLOTS ? ranked.slice(0, CHART_SLOTS - 1) : ranked;
    const byName = kept.map(([series]) => series).sort((left, right) => left.localeCompare(right));
    const lines: CampaignChartLine[] = kept.map(([series, visitors], index) => ({
        dataKey: `s${index}`,
        series,
        other: false,
        slot: byName.indexOf(series),
        visitors,
    }));
    const dataKeyOf = new Map(lines.map((line) => [line.series, line.dataKey]));
    if (ranked.length > kept.length) {
        const visitors = ranked.slice(kept.length).reduce((sum, [, count]) => sum + count, 0);
        lines.push({ dataKey: 'other', series: null, other: true, slot: -1, visitors });
    }

    const rows: Record<string, string | number>[] = xs.map((x) => Object.fromEntries([['x', x], ...lines.map((line) => [line.dataKey, 0])]));
    const rowOf = new Map(xs.map((x, index) => [x, rows[index]]));
    for (const point of points) {
        const row = rowOf.get(point.x);
        const dataKey = dataKeyOf.get(point.series) ?? 'other';
        if (row) row[dataKey] = Number(row[dataKey]) + point.visitors;
    }
    return { lines, rows };
}
