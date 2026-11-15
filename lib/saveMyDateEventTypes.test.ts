import { describe, expect, it } from 'vitest';

import { sameEventTypes, toggleEventType } from '@/lib/saveMyDateEventTypes';

describe('toggleEventType', () => {
    it('adds and removes one key, keeping the list sorted', () => {
        expect(toggleEventType(['WEDDING'], 'BAPTISM', true)).toEqual(['BAPTISM', 'WEDDING']);
        expect(toggleEventType(['BAPTISM', 'WEDDING'], 'WEDDING', false)).toEqual(['BAPTISM']);
    });

    it('never lists a key twice', () => {
        expect(toggleEventType(['WEDDING'], 'WEDDING', true)).toEqual(['WEDDING']);
    });
});

describe('sameEventTypes', () => {
    it('ignores order', () => {
        expect(sameEventTypes(['WEDDING', 'BAPTISM'], ['BAPTISM', 'WEDDING'])).toBe(true);
        expect(sameEventTypes(['WEDDING'], ['WEDDING', 'BAPTISM'])).toBe(false);
        expect(sameEventTypes([], [])).toBe(true);
    });
});
