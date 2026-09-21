import { describe, expect, it } from 'vitest';

import { datetimeLocalValueToIso, getScheduleDatetimeLocalBounds } from './datetime';

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
