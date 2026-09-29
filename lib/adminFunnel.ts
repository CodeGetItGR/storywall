import type { FunnelCohortDto, FunnelMetricsResponseDto } from '@/lib/api/types';

export const FUNNEL_RANGE_PRESETS = ['ALL', 'LAST_30', 'LAST_90', 'THIS_YEAR', 'CUSTOM'] as const;
export type FunnelRangePreset = (typeof FUNNEL_RANGE_PRESETS)[number];

export const FUNNEL_COHORT_WEEKS = [12, 26, 52] as const;
export type FunnelCohortWeeks = (typeof FUNNEL_COHORT_WEEKS)[number];

export type FunnelCohortMode = 'COUNT' | 'PERCENT';

/** `YYYY-MM-DD` dates the admin picked; either end may be empty. */
export type FunnelCustomRange = { from: string; to: string };

export type FunnelBounds = { since: string | null; until: string | null; isValid: boolean };

const DAY_MS = 24 * 60 * 60 * 1000;

function utcMidnight(date: string): Date {
    return new Date(`${date}T00:00:00Z`);
}

function toIso(date: Date): string {
    return date.toISOString().replace('.000Z', 'Z');
}

/** Today's calendar date in UTC, the day the backend's windows are counted in. */
export function utcToday(now: Date): string {
    return now.toISOString().slice(0, 10);
}

/**
 * The `since`/`until` pair for a range. Both are UTC midnights and `until` is exclusive, so a
 * range ending on a day covers all of that day: "up to 30 Sep" is `until=2026-10-01T00:00:00Z`.
 */
export function funnelRangeBounds(preset: FunnelRangePreset, custom: FunnelCustomRange, today: string): FunnelBounds {
    const tomorrow = toIso(new Date(utcMidnight(today).getTime() + DAY_MS));
    const daysBack = (days: number) => toIso(new Date(utcMidnight(today).getTime() - (days - 1) * DAY_MS));

    if (preset === 'ALL') return { since: null, until: null, isValid: true };
    if (preset === 'LAST_30') return { since: daysBack(30), until: tomorrow, isValid: true };
    if (preset === 'LAST_90') return { since: daysBack(90), until: tomorrow, isValid: true };
    if (preset === 'THIS_YEAR') return { since: `${today.slice(0, 4)}-01-01T00:00:00Z`, until: tomorrow, isValid: true };

    const since = custom.from ? toIso(utcMidnight(custom.from)) : null;
    const until = custom.to ? toIso(new Date(utcMidnight(custom.to).getTime() + DAY_MS)) : null;
    return { since, until, isValid: !since || !until || since < until };
}

/** part / whole, or null when there is nothing to divide by. */
export function rateOf(part: number, whole: number): number | null {
    return whole > 0 ? part / whole : null;
}

export const EMPTY_VALUE = '—';

export function formatRate(locale: string, ratio: number | null): string {
    if (ratio === null || !Number.isFinite(ratio)) return EMPTY_VALUE;
    const digits = ratio !== 0 && Math.abs(ratio) < 0.01 ? 2 : ratio !== 0 && Math.abs(ratio) < 0.1 ? 1 : 0;
    return new Intl.NumberFormat(locale, { style: 'percent', maximumFractionDigits: digits }).format(ratio);
}

export type HoursDisplay = { unit: 'hours' | 'days'; value: string } | null;

/** Below 48 hours reads as hours, otherwise days, one decimal. Negative values keep their sign. */
export function toHoursDisplay(locale: string, hours: number | null): HoursDisplay {
    if (hours === null || !Number.isFinite(hours)) return null;
    const format = new Intl.NumberFormat(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
    return Math.abs(hours) < 48 ? { unit: 'hours', value: format.format(hours) } : { unit: 'days', value: format.format(hours / 24) };
}

export function formatMedian(locale: string, value: number | null): string {
    if (value === null || !Number.isFinite(value)) return EMPTY_VALUE;
    return new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(value);
}

/** Minor units in their own currency, using that currency's decimals (e.g. 0 for JPY). */
export function formatMinorMoney(locale: string, minor: number, currency: string): string {
    try {
        const format = new Intl.NumberFormat(locale, { style: 'currency', currency });
        const digits = format.resolvedOptions().maximumFractionDigits ?? 2;
        return format.format(minor / 10 ** digits);
    } catch {
        return `${(minor / 100).toFixed(2)} ${currency}`;
    }
}

export type FunnelBreakdownRow = { key: string; value: number; ratio: number | null };

/** Known keys first, in order, with a missing key as 0; then any other key the backend sent, as-is. */
export function funnelBreakdown(values: Record<string, number>, knownKeys: readonly string[] = []): FunnelBreakdownRow[] {
    const unknown = Object.keys(values)
        .filter((key) => !knownKeys.includes(key))
        .sort((left, right) => (values[right] ?? 0) - (values[left] ?? 0) || left.localeCompare(right));
    const keys = [...knownKeys, ...unknown];
    const total = keys.reduce((sum, key) => sum + (values[key] ?? 0), 0);
    return keys.map((key) => ({ key, value: values[key] ?? 0, ratio: rateOf(values[key] ?? 0, total) }));
}

export const SIGNUP_PROVIDERS = ['LOCAL', 'OAUTH', 'INVITE'] as const;
export const BUYER_TYPES = ['CONSUMER', 'BUSINESS'] as const;

export type FunnelStepKey = 'signedUp' | 'emailVerified' | 'createdEvent' | 'paidHost';
export type FunnelStep = { key: FunnelStepKey; count: number; ofPrevious: number | null; ofSignups: number | null; share: number };

export function funnelSteps(funnel: FunnelMetricsResponseDto['funnel']): FunnelStep[] {
    const keys: FunnelStepKey[] = ['signedUp', 'emailVerified', 'createdEvent', 'paidHost'];
    return keys.map((key, index) => ({
        key,
        count: funnel[key],
        ofPrevious: index === 0 ? null : rateOf(funnel[key], funnel[keys[index - 1]]),
        ofSignups: index === 0 ? null : rateOf(funnel[key], funnel.signedUp),
        share: rateOf(funnel[key], funnel.signedUp) ?? 0,
    }));
}

export const COHORT_SERIES = ['signedUp', 'emailVerified', 'createdEvent', 'paidHost', 'engagedHost'] as const;
export type CohortSeries = (typeof COHORT_SERIES)[number];
export type CohortChartRow = { weekStart: string } & Record<CohortSeries, number | null>;

/** Cohort rows for the chart; in percent mode each value is its share of that week's signups (null when none). */
export function cohortChartRows(rows: FunnelCohortDto[], mode: FunnelCohortMode): CohortChartRow[] {
    return rows.map((row) => {
        const chartRow = { weekStart: row.weekStart } as CohortChartRow;
        for (const series of COHORT_SERIES) {
            chartRow[series] = mode === 'COUNT' ? row[series] : rateOf(row[series], row.signedUp);
        }
        return chartRow;
    });
}
