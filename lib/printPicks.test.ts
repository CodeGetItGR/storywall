import { describe, expect, it } from 'vitest';

import type { MediaResponseDto, PrintListItemDto } from '@/lib/api/types';
import { centsToEuroInput, euroInputToCents, isPrintable, pickedMediaIds, printableIds, printTotals } from '@/lib/printPicks';

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
    });

    it('refuses what is not a price', () => {
        expect(euroInputToCents('')).toBeNull();
        expect(euroInputToCents('-1')).toBeNull();
        expect(euroInputToCents('3.555')).toBeNull();
        expect(euroInputToCents('1000.01')).toBeNull();
    });
});
