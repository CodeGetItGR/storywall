import type { VendorReachDto } from '@/lib/api/types';

export type ReachTileKey = 'guests' | 'proViewers' | 'proViews' | 'postViewers' | 'reactions' | 'comments' | 'listTaps' | 'partnerCardTaps';

export interface ReachTile {
    key: ReachTileKey;
    value: number;
}

const TILE_ORDER: readonly ReachTileKey[] = [
    'guests',
    'proViewers',
    'proViews',
    'postViewers',
    'reactions',
    'comments',
    'listTaps',
    'partnerCardTaps',
];

// The tiles a vendor sees: exactly the numbers the backend sent. Partner card taps hide at 0
// (their card never ran in this event, or nobody tapped it).
export function reachTiles(reach: VendorReachDto): ReachTile[] {
    return TILE_ORDER.flatMap((key) => {
        const value = reach[key];
        if (typeof value !== 'number') return [];
        if (key === 'partnerCardTaps' && value === 0) return [];
        return [{ key, value }];
    });
}

export function formatReachCount(locale: string, value: number): string {
    return new Intl.NumberFormat(locale).format(value);
}
