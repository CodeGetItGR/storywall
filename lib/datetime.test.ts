import { describe, expect, it } from 'vitest';

import { datetimeLocalValueToIso } from './datetime';

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
