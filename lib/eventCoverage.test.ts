import { describe, expect, it } from 'vitest';

import { getCoverageStatus, getLatestStartAt, projectCoverage } from './eventCoverage';

const now = new Date('2026-09-21T10:00:00Z');
const days = (n: number) => new Date(now.getTime() + n * 86_400_000).toISOString();

describe('getCoverageStatus', () => {
    it('is null while the window is not pinned', () => {
        expect(getCoverageStatus({ coverageEndsAt: null }, now)).toBeNull();
    });

    it('is open until the final thirty days', () => {
        expect(getCoverageStatus({ coverageEndsAt: days(200) }, now)?.phase).toBe('open');
    });

    it('is closing in the final thirty days', () => {
        const status = getCoverageStatus({ coverageEndsAt: days(30) }, now);

        expect(status?.phase).toBe('closing');
        expect(status?.daysUntilEnd).toBe(30);
    });

    it('has ended once the coverage end has passed', () => {
        expect(getCoverageStatus({ coverageEndsAt: days(-1) }, now)?.phase).toBe('ended');
    });
});

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
