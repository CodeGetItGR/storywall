import { describe, expect, it } from 'vitest';

import type { RsvpReportCategoryDto } from '@/lib/api/types';
import { formatReportDate, isRsvpReportType, reportSectionKey } from '@/lib/rsvpReport';

describe('isRsvpReportType', () => {
    it('accepts the four report types and nothing else', () => {
        expect(isRsvpReportType('STATISTICS')).toBe(true);
        expect(isRsvpReportType('WITH_CHILDREN')).toBe(true);
        expect(isRsvpReportType('statistics')).toBe(false);
        expect(isRsvpReportType('EVERYTHING')).toBe(false);
    });
});

describe('formatReportDate', () => {
    // eventDate is already the event's local date; formatting it must never shift the day.
    it('prints the date the backend sent, in the reader language', () => {
        expect(formatReportDate('en', '2026-10-11')).toBe('October 11, 2026');
        expect(formatReportDate('el', '2026-10-11')).toBe('11 Οκτωβρίου 2026');
    });
});

describe('reportSectionKey', () => {
    it('tells categories apart by their answers, not their label', () => {
        const base = { label: 'x', responses: 1, people: 1, percentOfPeople: 100 } as RsvpReportCategoryDto;
        const a = { ...base, attending: true, comingSessionIds: ['s1'], noAnswerSessionIds: [] };
        const b = { ...base, attending: true, comingSessionIds: [], noAnswerSessionIds: ['s1'] };
        expect(reportSectionKey(a)).not.toBe(reportSectionKey(b));
    });
});
