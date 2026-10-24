import type { MediaResponseDto, PrintListItemDto } from '@/lib/api/types';

// The backend's limits (print-picks.max-list-items, max-print-sizes, copies 1–99).
export const PRINT_LIST_MAX_ITEMS = 100;
export const PRINT_SIZES_MAX = 8;
export const PRINT_COPIES_MAX = 99;
const PRICE_MAX_CENTS = 100_000;

export type PrintTotals = {
    prints: number;
    // The host's package; null for a guest list.
    included: number | null;
    // Copies the host or guest pays for.
    beyond: number;
    // Null when the photographer has no sizes.
    priceCents: number | null;
    hasPrices: boolean;
};

// "12 of 40 included · 3 more · €9.00". The included copies are the first ones on the list,
// in the order they were added; the rest are priced at their own size.
export function printTotals(items: readonly PrintListItemDto[], included: number | null): PrintTotals {
    const live = items.filter((item) => !item.removed);
    const prints = live.reduce((sum, item) => sum + item.copies, 0);
    const hasPrices = live.length > 0 && live.every((item) => item.unitPriceCents !== null);
    let free = included ?? 0;
    let priceCents = 0;
    for (const item of live) {
        const covered = Math.min(free, item.copies);
        free -= covered;
        priceCents += (item.copies - covered) * (item.unitPriceCents ?? 0);
    }
    return { prints, included, beyond: Math.max(0, prints - (included ?? 0)), priceCents: hasPrices ? priceCents : null, hasPrices };
}

// The backend accepts ready photos only (PRINT_ITEM_INVALID otherwise).
export function isPrintable(media: Pick<MediaResponseDto, 'mediaType' | 'status'>): boolean {
    return media.mediaType === 'IMAGE' && media.status === 'READY';
}

// The selected photos that can go on a print list, and how many other items were left out.
export function printableIds(media: readonly MediaResponseDto[], selected: ReadonlySet<string>): { ids: string[]; skipped: number } {
    const chosen = media.filter((item) => selected.has(item.id));
    const ids = chosen.filter(isPrintable).map((item) => item.id);
    return { ids, skipped: chosen.length - ids.length };
}

export function pickedMediaIds(items: readonly PrintListItemDto[]): Set<string> {
    return new Set(items.filter((item) => !item.removed).map((item) => item.mediaId));
}

export function centsToEuroInput(cents: number): string {
    return (cents / 100).toFixed(2);
}

// "3.5", "3,50" → 350. Null for anything that is not a price of 0 to 1,000 euros with up to 2 decimals.
export function euroInputToCents(text: string): number | null {
    const normalized = text.trim().replace(',', '.');
    if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return null;
    const cents = Math.round(Number(normalized) * 100);
    return cents <= PRICE_MAX_CENTS ? cents : null;
}
