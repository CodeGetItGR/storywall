import type { CalendarLoadThresholdsDto, PlanTimelineRowDto } from '@/lib/api/types';

export const COST_TRACKING_RANGES = {
    WEEK: { days: 7, weeks: 1 },
    MONTH: { days: 30, weeks: 4 },
} as const;

export type CostTrackingRange = keyof typeof COST_TRACKING_RANGES;

export type TimelineChartRow = Record<string, number | string> & {
    weekStart: string;
    estimatedCostMinor: number;
};

export type CalendarLoadTier = 'empty' | 'low' | 'medium' | 'high' | 'peak';

export interface CalendarMonthRange {
    since: string;
    until: string;
}

export function costTrackingSince(range: CostTrackingRange, now: Date): string {
    const since = new Date(now);
    since.setUTCDate(since.getUTCDate() - COST_TRACKING_RANGES[range].days);
    return since.toISOString();
}

export function calendarMonthRange(month: Date): CalendarMonthRange {
    const since = new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth(), 1));
    const until = new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth() + 1, 1));
    return { since: since.toISOString(), until: until.toISOString() };
}

export function shiftCalendarMonth(month: Date, offset: number): Date {
    return new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth() + offset, 1));
}

export function utcDateKey(value: Date | string): string {
    return new Date(value).toISOString().slice(0, 10);
}

export function calendarMonthDays(month: Date): Date[] {
    const firstDay = new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth(), 1));
    const leadingDays = (firstDay.getUTCDay() + 6) % 7;
    const gridStart = new Date(firstDay);
    gridStart.setUTCDate(gridStart.getUTCDate() - leadingDays);
    const daysInMonth = new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth() + 1, 0)).getUTCDate();
    const trailingDays = (7 - ((leadingDays + daysInMonth) % 7)) % 7;

    return Array.from({ length: leadingDays + daysInMonth + trailingDays }, (_, index) => {
        const day = new Date(gridStart);
        day.setUTCDate(day.getUTCDate() + index);
        return day;
    });
}

export function calendarLoadTier(eventCount: number, thresholds: CalendarLoadThresholdsDto): CalendarLoadTier {
    if (eventCount === 0) return 'empty';
    if (eventCount <= thresholds.lowMax) return 'low';
    if (eventCount <= thresholds.mediumMax) return 'medium';
    if (eventCount <= thresholds.highMax) return 'high';
    return 'peak';
}

export function timelineChartData(rows: PlanTimelineRowDto[], weeks: number, now: Date): { data: TimelineChartRow[]; planTiers: string[] } {
    const planTiers = [...new Set(rows.map((row) => row.planTierCode))].sort((left, right) => left.localeCompare(right));
    const rowByWeek = new Map<string, PlanTimelineRowDto[]>();

    rows.forEach((row) => {
        const weekStart = weekKey(row.weekStart);
        const existing = rowByWeek.get(weekStart) ?? [];
        existing.push(row);
        rowByWeek.set(weekStart, existing);
    });

    return {
        planTiers,
        data: weeklyBuckets(weeks, now).map((weekStart) => {
            const rowsForWeek = rowByWeek.get(weekStart) ?? [];
            const byPlan = new Map(rowsForWeek.map((row) => [row.planTierCode, row]));
            const estimatedCostMinor = rowsForWeek.reduce((sum, row) => sum + row.estimatedCostMinor, 0);
            const values = Object.fromEntries(planTiers.map((planTierCode) => [planTierCode, byPlan.get(planTierCode)?.eventCount ?? 0]));

            return { weekStart, estimatedCostMinor, ...values };
        }),
    };
}

function weeklyBuckets(weeks: number, now: Date): string[] {
    const currentWeekStart = mondayUtc(now);

    return Array.from({ length: weeks }, (_, index) => {
        const weekStart = new Date(currentWeekStart);
        weekStart.setUTCDate(weekStart.getUTCDate() - (weeks - index - 1) * 7);
        return weekStart.toISOString();
    });
}

function mondayUtc(value: Date): Date {
    const date = new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
    const offset = (date.getUTCDay() + 6) % 7;
    date.setUTCDate(date.getUTCDate() - offset);
    return date;
}

function weekKey(value: string): string {
    return mondayUtc(new Date(value)).toISOString();
}
