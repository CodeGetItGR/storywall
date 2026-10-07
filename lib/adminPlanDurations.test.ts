import { describe, expect, it } from 'vitest';

import {
    durationDraftFromOption,
    durationPatchFromDraft,
    durationPromoPriceFromDraft,
    isDurationDraftValid,
    newDurationDraft,
    parseDurationMonths,
    parseDurationPrice,
    sortDurationsForAdmin,
} from '@/lib/adminPlanDurations';
import type { CoverageOptionResponseDto } from '@/lib/api/types';

function option(overrides: Partial<CoverageOptionResponseDto> = {}): CoverageOptionResponseDto {
    return { id: 'o1', kind: 'INITIAL', months: 6, priceAmountMinor: 4_900, promoPriceAmountMinor: null, sortOrder: 0, active: true, ...overrides };
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

    it('needs a new duration length', () => {
        const draft = newDurationDraft();

        expect(draft).toEqual({ optionId: null, months: '', price: '', promoPrice: '' });
        expect(isDurationDraftValid({ ...draft, price: '49' })).toBe(false);
        expect(isDurationDraftValid({ ...draft, months: '6', price: '49' })).toBe(true);
    });

    it('patches only the fields that changed', () => {
        const existing = option();
        const draft = durationDraftFromOption(existing);

        expect(durationPatchFromDraft(existing, draft)).toEqual({});
        expect(durationPatchFromDraft(existing, { ...draft, price: '59' })).toEqual({ priceAmountMinor: 5_900 });
    });

    it('accepts a promo price only above zero and below the price', () => {
        const draft = { ...newDurationDraft(), months: '6', price: '49' };

        expect(isDurationDraftValid({ ...draft, promoPrice: '' })).toBe(true);
        expect(isDurationDraftValid({ ...draft, promoPrice: '39' })).toBe(true);
        expect(isDurationDraftValid({ ...draft, promoPrice: '49' })).toBe(false);
        expect(isDurationDraftValid({ ...draft, promoPrice: '0' })).toBe(false);
        expect(isDurationDraftValid({ ...draft, promoPrice: 'abc' })).toBe(false);
        expect(durationPromoPriceFromDraft({ ...draft, promoPrice: '39.50' })).toBe(3_950);
        expect(durationPromoPriceFromDraft(draft)).toBeNull();
    });

    it('sets, changes and clears a promo price', () => {
        const plain = option();
        const promoted = option({ promoPriceAmountMinor: 3_900 });

        expect(durationDraftFromOption(promoted).promoPrice).toBe('39');
        expect(durationPatchFromDraft(plain, { ...durationDraftFromOption(plain), promoPrice: '39' })).toEqual({ promoPriceAmountMinor: 3_900 });
        expect(durationPatchFromDraft(promoted, durationDraftFromOption(promoted))).toEqual({});
        expect(durationPatchFromDraft(promoted, { ...durationDraftFromOption(promoted), promoPrice: '29' })).toEqual({ promoPriceAmountMinor: 2_900 });
        expect(durationPatchFromDraft(promoted, { ...durationDraftFromOption(promoted), promoPrice: ' ' })).toEqual({ clearPromoPrice: true });
    });
});
