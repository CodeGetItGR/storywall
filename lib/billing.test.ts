import { describe, expect, it } from 'vitest';

import { formatMoney, lastWithdrawalMoment } from './billing';

describe('lastWithdrawalMoment', () => {
    it('is one second before the window closes', () => {
        expect(lastWithdrawalMoment('2026-10-06T21:00:00Z').toISOString()).toBe('2026-10-06T20:59:59.000Z');
    });
});

describe('formatMoney', () => {
    it('shows a bare amount when there is no currency', () => {
        expect(formatMoney('en', 3965, null)).toBe('39.65');
    });
});
