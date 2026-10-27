import { describe, expect, it } from 'vitest';

import type { PrintListItemDto } from '@/lib/api/types';
import { euroInputError, printTotalParts, printTotals } from '@/lib/printPicks';

function item(overrides: Partial<PrintListItemDto> = {}): PrintListItemDto {
    return { id: 'i1', mediaId: 'm1', media: null, removed: false, sizeId: 's1', sizeLabel: '13x18', unitPriceCents: 300, copies: 1, ...overrides };
}

describe('printTotalParts without the package', () => {
    it('leaves the package out and keeps the rest', () => {
        expect(printTotalParts(printTotals([item({ copies: 3 })], 1), { withIncluded: false })).toEqual([
            { key: 'beyond', count: 2 },
            { key: 'price', cents: 600 },
        ]);
    });

    it('is empty while the package covers every copy', () => {
        expect(printTotalParts(printTotals([item({ copies: 1 })], 5), { withIncluded: false })).toEqual([]);
    });

    it('still includes the package by default', () => {
        expect(printTotalParts(printTotals([item({ copies: 1 })], 5))).toEqual([{ key: 'included', used: 1, included: 5 }]);
    });
});

describe('euroInputError', () => {
    it('accepts prices from 0 to the limit, with a comma or a dot', () => {
        expect(euroInputError('0')).toBeNull();
        expect(euroInputError('3,5')).toBeNull();
        expect(euroInputError('1000')).toBeNull();
        expect(euroInputError('1000.00')).toBeNull();
    });

    it('tells a price above the limit from one that is not a price', () => {
        expect(euroInputError('1000.01')).toBe('tooHigh');
        expect(euroInputError('5000')).toBe('tooHigh');
        expect(euroInputError('')).toBe('invalid');
        expect(euroInputError('abc')).toBe('invalid');
        expect(euroInputError('1.234')).toBe('invalid');
        expect(euroInputError('-1')).toBe('invalid');
    });
});
