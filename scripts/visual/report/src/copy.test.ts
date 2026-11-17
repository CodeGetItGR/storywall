import { describe, expect, it } from 'vitest';

import { copy } from './copy';

describe('copy', () => {
    it('counts one capture in the singular', () => {
        expect(copy.capturesReviewed(1)).toBe('capture reviewed');
        expect(copy.capturesReviewed(5)).toBe('captures reviewed');
        expect(copy.differ(1, 1078)).toBe('1 of 1078 captures differs');
        expect(copy.differ(5, 1078)).toBe('5 of 1078 captures differ');
    });
});
