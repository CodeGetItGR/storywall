import { describe, expect, it } from 'vitest';

import { ApiError } from '@/lib/api/client';
import { BLOCKED_TERM_MAX, blockedTermError, validateBlockedTerm } from '@/lib/blockedTerms';

describe('validateBlockedTerm', () => {
    it('rejects blank and #-prefixed terms', () => {
        expect(validateBlockedTerm('  ')).toBe('invalid');
        expect(validateBlockedTerm('#tag')).toBe('invalid');
        expect(validateBlockedTerm(' word ')).toBeNull();
        expect(BLOCKED_TERM_MAX).toBe(60);
    });
});

describe('blockedTermError', () => {
    it('maps 409 to taken and anything else to other', () => {
        expect(blockedTermError(new ApiError(409, null))).toBe('taken');
        expect(blockedTermError(new ApiError(400, null))).toBe('other');
    });
});
