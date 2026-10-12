import { describe, expect, it } from 'vitest';

import { datetimeLocalValueToIso, eventWindowFromLocalStart, formatEventDateParts, getScheduleDatetimeLocalBounds } from './datetime';

describe('datetimeLocalValueToIso', () => {
    it('converts a datetime-local value to a full ISO-8601 instant with offset', () => {
        const expected = new Date('2026-09-20T14:30').toISOString();

        expect(datetimeLocalValueToIso('2026-09-20T14:30')).toBe(expected);
        expect(datetimeLocalValueToIso('2026-09-20T14:30')).toMatch(/Z$/);
    });

    it('returns null for empty or invalid input', () => {
        expect(datetimeLocalValueToIso('')).toBeNull();
        expect(datetimeLocalValueToIso(null)).toBeNull();
        expect(datetimeLocalValueToIso(undefined)).toBeNull();
        expect(datetimeLocalValueToIso('not-a-date')).toBeNull();
    });
});

describe('getScheduleDatetimeLocalBounds', () => {
    const referenceDate = new Date('2026-09-21T10:00:00');

    it('caps the start at the lead-day bound when no end date is set', () => {
        const { startAtMax } = getScheduleDatetimeLocalBounds({ startAt: '', maxLeadDays: 548, referenceDate });

        expect(startAtMax).toBe('2028-03-22T10:00');
    });

    it('uses the earlier of the end date and the lead-day bound', () => {
        const { startAtMax } = getScheduleDatetimeLocalBounds({ startAt: '', endAt: '2026-12-01T10:00', maxLeadDays: 548, referenceDate });

        expect(startAtMax).toBe('2026-12-01T10:00');
    });

    it('leaves the start uncapped without a lead-day bound or end date', () => {
        const { startAtMax } = getScheduleDatetimeLocalBounds({ startAt: '', referenceDate });

        expect(startAtMax).toBeUndefined();
    });
});

describe('eventWindowFromLocalStart', () => {
    it('ends a day after the start by default', () => {
        const window = eventWindowFromLocalStart('2026-10-10T18:00');
        expect(window).not.toBeNull();
        expect(Date.parse(window!.endAt) - Date.parse(window!.startAt)).toBe(24 * 60 * 60 * 1000);
        expect(window!.startAt).toBe(new Date('2026-10-10T18:00').toISOString());
    });

    it('keeps a given length and rejects an empty value', () => {
        const window = eventWindowFromLocalStart('2026-10-10T18:00', 6 * 60 * 60 * 1000);
        expect(Date.parse(window!.endAt) - Date.parse(window!.startAt)).toBe(6 * 60 * 60 * 1000);
        expect(eventWindowFromLocalStart('')).toBeNull();
    });
});

describe('formatEventDateParts', () => {
    it('names the date once for a same-day event, in the event time zone', () => {
        const parts = formatEventDateParts('en-GB', '2027-06-12T18:00:00+03:00', '2027-06-12T23:00:00+03:00', 'Europe/Athens');

        expect(parts?.date).toBe('Sat, 12 Jun 2027');
        expect(parts?.time).toMatch(/^18:00\s*–\s*23:00$/);
    });

    it('names both dates for an event that runs past midnight', () => {
        const parts = formatEventDateParts('en-GB', '2027-06-12T18:00:00+03:00', '2027-06-13T18:00:00+03:00', 'Europe/Athens');

        expect(parts?.date).toContain('12');
        expect(parts?.date).toContain('13 Jun');
        expect(parts?.time).toBe('18:00 – 18:00');
    });

    it('shows only the start without an end', () => {
        expect(formatEventDateParts('en-GB', '2027-06-12T18:00:00+03:00', null, 'Europe/Athens')).toEqual({ date: 'Sat, 12 Jun 2027', time: '18:00' });
    });

    it("falls back to the viewer's time zone for an unknown zone", () => {
        expect(formatEventDateParts('en-GB', '2027-06-12T18:00:00+03:00', null, 'Not/AZone')?.date).toContain('2027');
    });
});
