import { describe, expect, it } from 'vitest';

import type { MediaResponseDto, PrintListItemDto } from '@/lib/api/types';
import { centsToEuroInput, euroInputToCents, isPrintable, pickedMediaIds, printableIds, printTotalParts, printTotals } from '@/lib/printPicks';

function item(overrides: Partial<PrintListItemDto> = {}): PrintListItemDto {
    return {
        id: overrides.id ?? 'i1',
        mediaId: overrides.mediaId ?? 'm1',
        media: null,
        removed: false,
        sizeId: 's1',
        sizeLabel: '13x18',
        unitPriceCents: 300,
        copies: 1,
        ...overrides,
    };
}

describe('printTotals', () => {
    it('counts copies and prices the ones beyond the included count, in list order', () => {
        const items = [item({ copies: 2 }), item({ id: 'i2', unitPriceCents: 500, copies: 2 })];
        expect(printTotals(items, 3)).toEqual({ prints: 4, included: 3, beyond: 1, priceCents: 500, hasPrices: true });
    });

    it('prices every copy for a guest (no included count)', () => {
        expect(printTotals([item({ copies: 3 })], null)).toEqual({ prints: 3, included: null, beyond: 3, priceCents: 900, hasPrices: true });
    });

    it('has no price without sizes', () => {
        expect(printTotals([item({ sizeId: null, sizeLabel: null, unitPriceCents: null, copies: 2 })], 0)).toEqual({
            prints: 2,
            included: 0,
            beyond: 2,
            priceCents: null,
            hasPrices: false,
        });
    });

    it('has no price when any live copy has no price, never zero', () => {
        const totals = printTotals([item(), item({ id: 'i2', unitPriceCents: null })], null);
        expect(totals.priceCents).toBeNull();
        expect(totals.hasPrices).toBe(false);
    });

    it('has no price for an empty list', () => {
        expect(printTotals([], null)).toMatchObject({ prints: 0, priceCents: null, hasPrices: false });
    });

    it('does not let a removed item use included copies or add to the price', () => {
        const items = [item({ removed: true, copies: 5 }), item({ id: 'i2', copies: 2 })];
        expect(printTotals(items, 1)).toMatchObject({ prints: 2, beyond: 1, priceCents: 300 });
    });

    it('ignores the price of a removed item', () => {
        const items = [item({ removed: true, unitPriceCents: null }), item({ id: 'i2' })];
        expect(printTotals(items, null)).toMatchObject({ priceCents: 300, hasPrices: true });
    });

    it('skips removed photos', () => {
        expect(printTotals([item({ removed: true }), item({ id: 'i2' })], null).prints).toBe(1);
    });

    it('is free while everything is included', () => {
        expect(printTotals([item({ copies: 2 })], 40)).toMatchObject({ beyond: 0, priceCents: 0 });
    });
});

describe('printable media', () => {
    const photo = { id: 'p', mediaType: 'IMAGE', status: 'READY' } as MediaResponseDto;
    const video = { id: 'v', mediaType: 'VIDEO', status: 'READY' } as MediaResponseDto;
    const processing = { id: 'x', mediaType: 'IMAGE', status: 'PROCESSING' } as MediaResponseDto;
    const audio = { id: 'a', mediaType: 'AUDIO', status: 'READY' } as MediaResponseDto;

    it('accepts photos and refuses videos', () => {
        expect(isPrintable(photo)).toBe(true);
        expect(isPrintable(video)).toBe(false);
        expect(printableIds([photo, video], new Set(['p', 'v']))).toEqual({ ids: ['p'], skipped: 1 });
    });

    it('counts unprintable and unloaded selected ids as skipped', () => {
        expect(printableIds([photo, processing], new Set(['p', 'x', 'gone']))).toEqual({ ids: ['p'], skipped: 2 });
    });

    it('refuses photos that are not ready and non-photo media', () => {
        expect(isPrintable(processing)).toBe(false);
        expect(isPrintable(audio)).toBe(false);
    });
});

describe('pickedMediaIds', () => {
    it('lists the live picks', () => {
        expect(pickedMediaIds([item({ mediaId: 'a' }), item({ id: 'i2', mediaId: 'b', removed: true })])).toEqual(new Set(['a']));
    });
});

describe('euro input', () => {
    it('round-trips cents', () => {
        expect(centsToEuroInput(350)).toBe('3.50');
        expect(euroInputToCents('3.5')).toBe(350);
        expect(euroInputToCents('3,50')).toBe(350);
        expect(euroInputToCents('0')).toBe(0);
        expect(euroInputToCents('0.29')).toBe(29);
        expect(euroInputToCents('1000')).toBe(100000);
        expect(euroInputToCents(' 3,5 ')).toBe(350);
    });

    it('refuses what is not a price', () => {
        expect(euroInputToCents('')).toBeNull();
        for (const text of ['.5', '5.', '1.000,00', '1e2']) expect(euroInputToCents(text)).toBeNull();
        expect(euroInputToCents('-1')).toBeNull();
        expect(euroInputToCents('3.555')).toBeNull();
        expect(euroInputToCents('1000.01')).toBeNull();
    });
});

describe('printTotalParts', () => {
    it('lists the package, the copies beyond it and their price', () => {
        expect(printTotalParts(printTotals([item({ copies: 3, unitPriceCents: 300 })], 1))).toEqual([
            { key: 'included', used: 1, included: 1 },
            { key: 'beyond', count: 2 },
            { key: 'price', cents: 600 },
        ]);
    });

    it('leaves out the package when none is included', () => {
        expect(printTotalParts(printTotals([item({ copies: 2, unitPriceCents: 300 })], 0))).toEqual([
            { key: 'beyond', count: 2 },
            { key: 'price', cents: 600 },
        ]);
        expect(printTotalParts(printTotals([item({ copies: 2, unitPriceCents: 300 })], null))).toHaveLength(2);
    });

    it('shows only the package while it covers every copy', () => {
        expect(printTotalParts(printTotals([item({ copies: 1 })], 5))).toEqual([{ key: 'included', used: 1, included: 5 }]);
    });

    it('has an unknown price when a size has none', () => {
        expect(printTotalParts(printTotals([item({ copies: 1, unitPriceCents: null })], 0))).toEqual([
            { key: 'beyond', count: 1 },
            { key: 'price', cents: null },
        ]);
    });
});
