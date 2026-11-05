import { describe, expect, it } from 'vitest';

import { CAMPAIGNS_HASH_ROOT, DISCOUNT_CAMPAIGNS_HASH_ROOT, formatRecordHash, isRecordHash, parseRecordHash } from '@/lib/adminRecordRouting';

describe('admin record pages', () => {
    it('reads the list, the new form and a record', () => {
        expect(parseRecordHash(CAMPAIGNS_HASH_ROOT, '#campaigns')).toBeNull();
        expect(parseRecordHash(CAMPAIGNS_HASH_ROOT, '#campaigns/new')).toBe('new');
        expect(parseRecordHash(CAMPAIGNS_HASH_ROOT, '#campaigns/abc')).toBe('abc');
    });

    it('does not mistake another section for its own', () => {
        expect(isRecordHash(CAMPAIGNS_HASH_ROOT, '#campaign-overview')).toBe(false);
        expect(isRecordHash(CAMPAIGNS_HASH_ROOT, '#discount-campaigns/abc')).toBe(false);
        expect(isRecordHash(DISCOUNT_CAMPAIGNS_HASH_ROOT, '#discount-campaigns/abc')).toBe(true);
    });

    it('survives a malformed address', () => {
        expect(parseRecordHash(CAMPAIGNS_HASH_ROOT, '#campaigns/%E0%A4%A')).toBeNull();
    });

    it('writes what it reads', () => {
        expect(formatRecordHash(CAMPAIGNS_HASH_ROOT, null)).toBe('#campaigns');
        expect(formatRecordHash(CAMPAIGNS_HASH_ROOT, 'a b')).toBe('#campaigns/a%20b');
    });
});
