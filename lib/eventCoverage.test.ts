import { describe, expect, it } from 'vitest';

import { getCoverageStatus, getGalleryLeadDays, projectCoverage } from './eventCoverage';

const now = new Date('2026-09-21T10:00:00Z');
const days = (n: number) => new Date(now.getTime() + n * 86_400_000).toISOString();

describe('getCoverageStatus', () => {
    it('is null while the window is not pinned', () => {
        expect(getCoverageStatus({ galleryOpensAt: null, coverageEndsAt: null }, now)).toBeNull();
    });

    it('counts down to the gallery opening', () => {
        const status = getCoverageStatus({ galleryOpensAt: days(12), coverageEndsAt: days(400) }, now);

        expect(status?.phase).toBe('beforeOpen');
        expect(status?.daysUntilOpen).toBe(12);
    });

    it('is open between the two dates', () => {
        expect(getCoverageStatus({ galleryOpensAt: days(-5), coverageEndsAt: days(200) }, now)?.phase).toBe('open');
    });

    it('is closing in the final thirty days', () => {
        const status = getCoverageStatus({ galleryOpensAt: days(-300), coverageEndsAt: days(30) }, now);

        expect(status?.phase).toBe('closing');
        expect(status?.daysUntilEnd).toBe(30);
    });

    it('has ended once the coverage end has passed', () => {
        expect(getCoverageStatus({ galleryOpensAt: days(-400), coverageEndsAt: days(-1) }, now)?.phase).toBe('ended');
    });
});

describe('projectCoverage', () => {
    const coverage = { maxPreEventDays: 90, defaultHostingMonths: 12 };

    it('is null without a start or the config', () => {
        expect(projectCoverage({ startAt: '', coverage, referenceDate: now })).toBeNull();
        expect(projectCoverage({ startAt: days(10), coverage: null, referenceDate: now })).toBeNull();
    });

    it('opens 90 days before the event and keeps it for the default term', () => {
        const projection = projectCoverage({ startAt: '2027-06-01T10:00:00Z', coverage, referenceDate: now });
        expect(projection).toEqual({
            galleryOpensAt: '2027-03-03T10:00:00.000Z',
            coverageEndsAt: '2028-06-01T10:00:00.000Z',
            hostingMonths: 12,
        });
    });

    it('never opens before now and honours the plan term', () => {
        const projection = projectCoverage({ startAt: days(10), hostingMonths: 3, coverage, referenceDate: now });
        expect(projection?.galleryOpensAt).toBe(now.toISOString());
        expect(projection?.coverageEndsAt).toBe('2027-01-01T10:00:00.000Z');
        expect(projection?.hostingMonths).toBe(3);
    });
});

describe('getGalleryLeadDays', () => {
    it('counts the days between opening and the event', () => {
        expect(getGalleryLeadDays(days(0), days(90))).toBe(90);
        expect(getGalleryLeadDays(days(5), days(5))).toBe(0);
    });
});
