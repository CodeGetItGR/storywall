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

// Made-up partner numbers, shown blurred behind the locked part of a non-partner's report. Never readable, never real data.
const SAMPLE_VALUES: Partial<Record<ReachTileKey, number>> = {
    proViewers: 96,
    proViews: 1204,
    postViewers: 88,
    reactions: 57,
    comments: 12,
    partnerCardTaps: 9,
};

// The partner tiles a vendor of this kind would unlock: Pro numbers for types with a Pro album, post numbers for the rest.
export function reachSampleTiles(hasProAlbum: boolean): ReachTile[] {
    const keys: ReachTileKey[] = hasProAlbum
        ? ['proViewers', 'proViews', 'reactions', 'comments']
        : ['postViewers', 'reactions', 'comments', 'partnerCardTaps'];
    return keys.map((key) => ({ key, value: SAMPLE_VALUES[key] ?? 0 }));
}
