import { describe, expect, it } from 'vitest';

import { partnerBalances, tierProgressRatio } from '@/lib/partnerPortal';

describe('partnerBalances', () => {
    it('works out what is still owed per currency', () => {
        expect(partnerBalances([{ currency: 'EUR', accruedMinor: 12000, paidMinor: 9600 }])).toEqual([
            { currency: 'EUR', earnedMinor: 12000, paidMinor: 9600, owedMinor: 2400 },
        ]);
    });
});

describe('tierProgressRatio', () => {
    it('measures this year against the next tier', () => {
        expect(tierProgressRatio({ activationsThisYear: 3, currentPercent: 10, nextTierMinActivations: 5, nextTierPercent: 15 })).toBe(0.6);
        expect(tierProgressRatio({ activationsThisYear: 9, currentPercent: 10, nextTierMinActivations: 5, nextTierPercent: 15 })).toBe(1);
    });

    it('has no bar at the top tier', () => {
        expect(tierProgressRatio({ activationsThisYear: 30, currentPercent: 20, nextTierMinActivations: null, nextTierPercent: null })).toBeNull();
    });
});
