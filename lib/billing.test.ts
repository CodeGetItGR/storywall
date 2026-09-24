import { describe, expect, it } from 'vitest';

import { canExtendCoverage, formatMoney, lastWithdrawalMoment } from './billing';

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

describe('canExtendCoverage', () => {
    const now = new Date('2026-09-24T12:00:00Z');
    const eligible = { isPrimaryHost: true, eventStatus: 'ACTIVE' as const, coverageEndsAt: '2027-09-24T12:00:00Z', now };

    it('allows the main host of a live event whose coverage has not ended', () => {
        expect(canExtendCoverage(eligible)).toBe(true);
    });

    it('refuses a co-host, a draft, ended coverage and a missing end', () => {
        expect(canExtendCoverage({ ...eligible, isPrimaryHost: false })).toBe(false);
        expect(canExtendCoverage({ ...eligible, eventStatus: 'DRAFT' })).toBe(false);
        expect(canExtendCoverage({ ...eligible, coverageEndsAt: '2026-09-24T12:00:00Z' })).toBe(false);
        expect(canExtendCoverage({ ...eligible, coverageEndsAt: null })).toBe(false);
    });
});
