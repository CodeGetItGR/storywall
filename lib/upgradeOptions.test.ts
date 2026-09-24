import { describe, expect, it } from 'vitest';

import type { UpgradeCoverageOptionDto, UpgradeOptionResponseDto } from '@/lib/api/types';
import { linkedUpgradeDuration, pickedUpgradeDuration, upgradeDurations } from '@/lib/upgradeOptions';

function makeDuration(overrides: Partial<UpgradeCoverageOptionDto> = {}): UpgradeCoverageOptionDto {
    return { coverageOptionId: 'plus-6', months: 6, monthsAdded: 0, gapAmountMinor: 3_000, payableAmountMinor: 2_700, ...overrides };
}

const entry: UpgradeOptionResponseDto = {
    planTierCode: 'PLUS',
    planTierName: 'Plus',
    currency: 'EUR',
    options: [
        makeDuration({ coverageOptionId: 'plus-12', months: 12, monthsAdded: 6, gapAmountMinor: 5_000, payableAmountMinor: 4_500 }),
        makeDuration(),
    ],
    discountPercent: 10,
    discountLabel: 'Spring offer',
};

describe('upgradeDurations', () => {
    it('lists the durations shortest first', () => {
        expect(upgradeDurations(entry).map((duration) => duration.coverageOptionId)).toEqual(['plus-6', 'plus-12']);
    });
});

describe('pickedUpgradeDuration', () => {
    it('returns the picked duration', () => {
        expect(pickedUpgradeDuration(entry, 'plus-12')?.monthsAdded).toBe(6);
    });

    it('falls back to the shortest when nothing, or something no longer offered, is picked', () => {
        expect(pickedUpgradeDuration(entry, undefined)?.coverageOptionId).toBe('plus-6');
        expect(pickedUpgradeDuration(entry, 'plus-24')?.coverageOptionId).toBe('plus-6');
    });
});

describe('linkedUpgradeDuration', () => {
    it('returns the linked duration', () => {
        expect(linkedUpgradeDuration(entry, 'plus-12')?.payableAmountMinor).toBe(4_500);
    });

    it('starts on the shortest when the link names none', () => {
        expect(linkedUpgradeDuration(entry, null)?.coverageOptionId).toBe('plus-6');
    });

    it('resolves to nothing when the linked duration is no longer offered', () => {
        expect(linkedUpgradeDuration(entry, 'plus-24')).toBeNull();
    });
});
