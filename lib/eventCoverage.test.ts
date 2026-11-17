import { describe, expect, it } from 'vitest';

import { coverageFitsStart, getLatestStartAt, projectCoverage } from './eventCoverage';

const now = new Date('2026-09-21T10:00:00Z');

describe('projectCoverage', () => {
    it('is null without a duration', () => {
        expect(projectCoverage({ hostingMonths: undefined, referenceDate: now })).toBeNull();
    });

    it('keeps the event for the picked months from payment', () => {
        const projection = projectCoverage({ hostingMonths: 12, referenceDate: new Date('2026-10-12T10:00:00Z') });
        expect(projection).toEqual({ coverageEndsAt: '2027-10-12T10:00:00.000Z', hostingMonths: 12 });
    });
});

describe('getLatestStartAt', () => {
    it('leaves the minimum days of coverage after the start', () => {
        expect(getLatestStartAt('2027-10-12T10:00:00.000Z', 30)).toBe('2027-09-12T10:00:00.000Z');
    });

    it('is null until both the coverage end and the minimum are known', () => {
        expect(getLatestStartAt(null, 30)).toBeNull();
        expect(getLatestStartAt('2027-10-12T10:00:00.000Z', undefined)).toBeNull();
    });
});

describe('coverageFitsStart', () => {
    // 3 months from now ends 2026-12-21; leaving 30 days, the latest start is 2026-11-21.
    const fits = (startAt: string | null, minDaysAfterStart: number | undefined = 30) =>
        coverageFitsStart({ startAt, months: 3, minDaysAfterStart, referenceDate: now });

    it('fits a start up to the latest one', () => {
        expect(fits('2026-11-21T10:00:00.000Z')).toBe(true);
    });

    it('does not fit a start after the latest one', () => {
        expect(fits('2026-11-21T10:00:01.000Z')).toBe(false);
    });

    it('fits while the start or the setting is unknown', () => {
        expect(fits(null)).toBe(true);
        expect(coverageFitsStart({ startAt: '2027-06-01T00:00:00.000Z', months: 3, minDaysAfterStart: undefined, referenceDate: now })).toBe(true);
    });
});
