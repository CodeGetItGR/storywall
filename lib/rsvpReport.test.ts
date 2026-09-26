import { describe, expect, it } from 'vitest';

import type { RsvpReportCategoryDto } from '@/lib/api/types';
import { formatReportDate, isRsvpReportType, reportSectionKey, resolveRsvpReportCloseHref, resolveRsvpSubTab } from '@/lib/rsvpReport';

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

describe('resolveRsvpSubTab', () => {
    it('defaults to stats for null or undefined', () => {
        expect(resolveRsvpSubTab(null)).toBe('stats');
        expect(resolveRsvpSubTab(undefined)).toBe('stats');
    });

    it('accepts a known sub-tab', () => {
        expect(resolveRsvpSubTab('list')).toBe('list');
        expect(resolveRsvpSubTab('reports')).toBe('reports');
    });

    it('falls back to stats for a sub-tab it does not know', () => {
        expect(resolveRsvpSubTab('coHosts')).toBe('stats');
    });

    it('takes the first element of a repeated query param', () => {
        expect(resolveRsvpSubTab(['reports', 'list'])).toBe('reports');
    });

    it('falls back to stats for an empty array', () => {
        expect(resolveRsvpSubTab([])).toBe('stats');
    });
});

describe('resolveRsvpReportCloseHref', () => {
    it('returns to the Tools RSVP page, on the Reports sub-tab', () => {
        expect(resolveRsvpReportCloseHref('e1', 'tools')).toBe('/events/e1/tools/rsvp?section=reports');
    });

    it('returns to Manage for null, the default origin', () => {
        expect(resolveRsvpReportCloseHref('e1', null)).toBe('/events/e1/manage?tab=rsvp&section=reports');
    });

    it('falls back to Manage for a garbage value', () => {
        expect(resolveRsvpReportCloseHref('e1', 'not-a-real-origin')).toBe('/events/e1/manage?tab=rsvp&section=reports');
    });
});
