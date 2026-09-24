import { describe, expect, it } from 'vitest';

import {
    durationDraftFromOption,
    durationPatchFromDraft,
    isDurationDraftValid,
    newDurationDraft,
    parseDurationMonths,
    parseDurationPrice,
    sortDurationsForAdmin,
} from '@/lib/adminPlanDurations';
import type { CoverageOptionResponseDto } from '@/lib/api/types';

function option(overrides: Partial<CoverageOptionResponseDto> = {}): CoverageOptionResponseDto {
    return { id: 'o1', kind: 'INITIAL', months: 6, priceAmountMinor: 4_900, sortOrder: 0, active: true, ...overrides };
}

describe('admin plan durations', () => {
    it('accepts whole months from 1 to 120 only', () => {
        expect(parseDurationMonths('6')).toBe(6);
        expect(parseDurationMonths(' 120 ')).toBe(120);
        expect(parseDurationMonths('0')).toBeNull();
        expect(parseDurationMonths('121')).toBeNull();
        expect(parseDurationMonths('1.5')).toBeNull();
        expect(parseDurationMonths('')).toBeNull();
    });

    it('parses prices into minor units and refuses blanks and negatives', () => {
        expect(parseDurationPrice('49')).toBe(4_900);
        expect(parseDurationPrice('0')).toBe(0);
        expect(parseDurationPrice('')).toBeNull();
        expect(parseDurationPrice('-1')).toBeNull();
        expect(parseDurationPrice('abc')).toBeNull();
    });

    it('lists live durations first, then by order and length', () => {
        const sorted = sortDurationsForAdmin([
            option({ id: 'retired', active: false, sortOrder: 0 }),
            option({ id: 'second', sortOrder: 1 }),
            option({ id: 'first', sortOrder: 0, months: 12 }),
            option({ id: 'first-shorter', sortOrder: 0, months: 3 }),
        ]);

        expect(sorted.map(({ id }) => id)).toEqual(['first-shorter', 'first', 'second', 'retired']);
    });

    it('puts a new duration after the existing ones and needs its length', () => {
        const draft = newDurationDraft([option({ sortOrder: 4 })]);

        expect(draft).toEqual({ optionId: null, months: '', price: '', sortOrder: '5' });
        expect(isDurationDraftValid({ ...draft, price: '49' })).toBe(false);
        expect(isDurationDraftValid({ ...draft, months: '6', price: '49' })).toBe(true);
    });

    it('patches only the fields that changed', () => {
        const existing = option();
        const draft = durationDraftFromOption(existing);

        expect(durationPatchFromDraft(existing, draft)).toEqual({});
        expect(durationPatchFromDraft(existing, { ...draft, price: '59' })).toEqual({ priceAmountMinor: 5_900 });
        expect(durationPatchFromDraft(existing, { ...draft, sortOrder: '2' })).toEqual({ sortOrder: 2 });
    });
});
