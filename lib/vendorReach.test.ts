import { describe, expect, it } from 'vitest';

import { formatReachCount, reachTiles } from '@/lib/vendorReach';

describe('reachTiles', () => {
    it('shows a non-partner guests and list taps', () => {
        expect(reachTiles({ guests: 120, listTaps: 8, partner: false })).toEqual([
            { key: 'guests', value: 120 },
            { key: 'listTaps', value: 8 },
        ]);
    });

    it('shows a partner everything sent, in order, without zero card taps', () => {
        const tiles = reachTiles({
            guests: 120,
            listTaps: 8,
            proViewers: 64,
            proViews: 410,
            postViewers: 90,
            reactions: 33,
            comments: 5,
            partnerCardTaps: 0,
            partner: true,
        });
        expect(tiles.map((tile) => tile.key)).toEqual(['guests', 'proViewers', 'proViews', 'postViewers', 'reactions', 'comments', 'listTaps']);
    });

    it('keeps card taps above zero', () => {
        expect(reachTiles({ guests: 1, listTaps: 0, postViewers: 0, reactions: 0, comments: 0, partnerCardTaps: 3, partner: true }).at(-1)).toEqual({
            key: 'partnerCardTaps',
            value: 3,
        });
    });
});

describe('formatReachCount', () => {
    it('groups thousands in the locale', () => {
        expect(formatReachCount('en', 1234)).toBe('1,234');
        expect(formatReachCount('el', 1234)).toBe('1.234');
    });
});
