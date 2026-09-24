import { describe, expect, it } from 'vitest';

import { getCoverageStatus, projectCoverage } from './eventCoverage';

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
    it('is null without a start or a duration', () => {
        expect(projectCoverage({ startAt: '', hostingMonths: 12, referenceDate: now })).toBeNull();
        expect(projectCoverage({ startAt: days(10), hostingMonths: undefined, referenceDate: now })).toBeNull();
    });

    it('keeps the event for the picked months after its start', () => {
        const projection = projectCoverage({ startAt: '2027-06-01T10:00:00Z', hostingMonths: 12, referenceDate: now });
        expect(projection).toEqual({ coverageEndsAt: '2028-06-01T10:00:00.000Z', hostingMonths: 12 });
    });

    it('never ends before now', () => {
        const projection = projectCoverage({ startAt: '2025-01-01T10:00:00Z', hostingMonths: 3, referenceDate: now });
        expect(projection?.coverageEndsAt).toBe(now.toISOString());
        expect(projection?.hostingMonths).toBe(3);
    });
});
