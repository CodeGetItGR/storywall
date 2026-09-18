import { describe, expect, it } from 'vitest';

import { calendarLoadTier, calendarMonthDays, calendarMonthRange, costTrackingSince, timelineChartData } from '@/lib/costTracking';

describe('cost tracking helpers', () => {
    const now = new Date('2026-09-10T12:00:00.000Z');

    it('maps the selected range to the requested traffic start time', () => {
        expect(costTrackingSince('WEEK', now)).toBe('2026-09-03T12:00:00.000Z');
        expect(costTrackingSince('MONTH', now)).toBe('2026-08-11T12:00:00.000Z');
    });

    it('fills missing plan and week combinations with zeroes', () => {
        const chart = timelineChartData(
            [
                { planTierCode: 'BASIC', weekStart: '2026-08-24T00:00:00Z', eventCount: 4, estimatedCostMinor: 1200, currency: 'EUR' },
                { planTierCode: 'PRO', weekStart: '2026-09-07T00:00:00Z', eventCount: 1, estimatedCostMinor: 900, currency: 'EUR' },
            ],
            4,
            now
        );

        expect(chart.planTiers).toEqual(['BASIC', 'PRO']);
        expect(chart.data).toEqual([
            { weekStart: '2026-08-17T00:00:00.000Z', estimatedCostMinor: 0, BASIC: 0, PRO: 0 },
            { weekStart: '2026-08-24T00:00:00.000Z', estimatedCostMinor: 1200, BASIC: 4, PRO: 0 },
            { weekStart: '2026-08-31T00:00:00.000Z', estimatedCostMinor: 0, BASIC: 0, PRO: 0 },
            { weekStart: '2026-09-07T00:00:00.000Z', estimatedCostMinor: 900, BASIC: 0, PRO: 1 },
        ]);
    });

    it('builds UTC calendar ranges and load tiers from backend thresholds', () => {
        const month = new Date('2026-09-10T12:00:00.000Z');
        const thresholds = { lowMax: 10, mediumMax: 30, highMax: 50 };

        expect(calendarMonthRange(month)).toEqual({ since: '2026-09-01T00:00:00.000Z', until: '2026-10-01T00:00:00.000Z' });
        expect(calendarMonthDays(month)).toHaveLength(35);
        expect(calendarLoadTier(0, thresholds)).toBe('empty');
        expect(calendarLoadTier(10, thresholds)).toBe('low');
        expect(calendarLoadTier(11, thresholds)).toBe('medium');
        expect(calendarLoadTier(31, thresholds)).toBe('high');
        expect(calendarLoadTier(51, thresholds)).toBe('peak');
    });
});
