import { describe, expect, it } from 'vitest';

import { formatWithdrawalsHash, isWithdrawalsHash, parseWithdrawalsHash } from '@/lib/adminWithdrawalsRouting';

describe('withdrawals hash routing', () => {
    it('round-trips a request id', () => {
        const id = '358ea2d1-fe37-4313-81e3-ca46eea2ba14';
        expect(parseWithdrawalsHash(formatWithdrawalsHash(id))).toBe(id);
    });

    it('treats the bare root as the list', () => {
        expect(formatWithdrawalsHash(null)).toBe('#withdrawals');
        expect(parseWithdrawalsHash('#withdrawals')).toBeNull();
    });

    it('ignores other sections', () => {
        expect(isWithdrawalsHash('#withdrawalsX')).toBe(false);
        expect(parseWithdrawalsHash('#plans/WEDDING')).toBeNull();
    });
});
