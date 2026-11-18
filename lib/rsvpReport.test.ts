import { describe, expect, it } from 'vitest';

import type { RsvpReportCategoryDto } from '@/lib/api/types';
import { formatReportDate, isRsvpReportType, reportSectionKey, resolveRsvpReportCloseHref, rsvpCountdown } from '@/lib/rsvpReport';

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

describe('resolveRsvpReportCloseHref', () => {
    it('goes back to the RSVP page in the dashboard', () => {
        expect(resolveRsvpReportCloseHref('e1', null)).toBe('/events/e1/manage?tab=rsvp');
    });

    it('sends an old from=tools link to the same RSVP page', () => {
        expect(resolveRsvpReportCloseHref('e1', 'tools')).toBe('/events/e1/manage?tab=rsvp');
    });

    it('falls back to the RSVP page for a garbage value', () => {
        expect(resolveRsvpReportCloseHref('e1', 'not-a-real-origin')).toBe('/events/e1/manage?tab=rsvp');
    });

    it('returns a vendor to their vendor page', () => {
        expect(resolveRsvpReportCloseHref('e1', 'vendor')).toBe('/events/e1/tools/vendors/me');
    });
});

describe('rsvpCountdown', () => {
    const now = new Date('2026-08-12T10:00:00Z');

    it('counts to the RSVP deadline when there is one', () => {
        expect(rsvpCountdown('2026-08-30T00:00:00Z', '2026-09-20T16:00:00Z', now)).toEqual({
            labelKey: 'deadlineLabel',
            target: '2026-08-30T00:00:00Z',
            daysLeft: 18,
        });
    });

    it('falls back to the event date when no deadline is set', () => {
        expect(rsvpCountdown(null, '2026-09-20T16:00:00Z', now)).toEqual({
            labelKey: 'eventDateLabel',
            target: '2026-09-20T16:00:00Z',
            daysLeft: 40,
        });
    });

    it('never goes below zero', () => {
        expect(rsvpCountdown('2026-08-01T00:00:00Z', '2026-09-20T16:00:00Z', now).daysLeft).toBe(0);
    });
});
