import { describe, expect, it } from 'vitest';

import { layoutFeatureTiles, QR_CARD_SAMPLE_FEATURES, type QrCardFeature, qrCardFeatures } from '@/lib/qrCardFeatures';
import { DEFAULT_QR_CARD_FEATURES } from '@/lib/qrCardLayout';

function plan(...keys: string[]) {
    return keys.map((moduleKey) => ({ moduleKey, isAvailable: true }));
}

describe('qrCardFeatures', () => {
    it('shows the main five in order for a full plan', () => {
        expect(qrCardFeatures(plan('playlist', 'wishbook', 'stories', 'posts', 'gallery', 'rsvp'))).toEqual([
            'posts',
            'stories',
            'wishes',
            'reactions',
            'music',
        ]);
    });

    it('gives Posts for a gallery alone, but not Reactions', () => {
        expect(qrCardFeatures(plan('gallery'))).toEqual(['posts']);
    });

    it('skips modules the plan does not make available', () => {
        expect(qrCardFeatures([{ moduleKey: 'stories', isAvailable: false }, ...plan('wishbook')])).toEqual(['wishes']);
    });

    it('never shows RSVP, and shows nothing for an empty plan', () => {
        expect(qrCardFeatures(plan('rsvp'))).toEqual([]);
        expect(qrCardFeatures([])).toEqual([]);
    });

    it('samples the main five for admin previews', () => {
        expect(QR_CARD_SAMPLE_FEATURES).toEqual(['posts', 'stories', 'wishes', 'reactions', 'music']);
    });
});

const BOX = DEFAULT_QR_CARD_FEATURES;
const SIZE = 26;

function centreOf(tiles: { x: number; scale: number }[]) {
    const left = tiles[0].x;
    const right = tiles[tiles.length - 1].x + SIZE * tiles[0].scale;
    return (left + right) / 2;
}

describe('layoutFeatureTiles', () => {
    const five: QrCardFeature[] = ['posts', 'stories', 'wishes', 'reactions', 'music'];

    it('places nothing for no tiles', () => {
        expect(layoutFeatureTiles([], BOX)).toEqual([]);
    });

    it('puts five in rows of 3 and 2, each centred, with fixed tilts', () => {
        const tiles = layoutFeatureTiles(five, BOX);
        expect(tiles.map((tile) => tile.feature)).toEqual(five);
        expect(tiles.map((tile) => tile.tilt)).toEqual([-5, 3, -3, 4, -4]);
        expect(new Set(tiles.slice(0, 3).map((tile) => tile.y)).size).toBe(1);
        expect(tiles[3].y).toBe(tiles[4].y);
        expect(tiles[3].y).toBeGreaterThan(tiles[0].y);
        expect(centreOf(tiles.slice(0, 3))).toBeCloseTo(BOX.x + BOX.width / 2, 0);
        expect(centreOf(tiles.slice(3))).toBeCloseTo(BOX.x + BOX.width / 2, 0);
    });

    it('keeps every tile and label inside the box', () => {
        for (let count = 1; count <= 5; count++) {
            for (const tile of layoutFeatureTiles(five.slice(0, count), BOX)) {
                expect(tile.x).toBeGreaterThanOrEqual(BOX.x - 0.1);
                expect(tile.y).toBeGreaterThanOrEqual(BOX.y - 0.1);
                expect(tile.x + SIZE * tile.scale).toBeLessThanOrEqual(BOX.x + BOX.width + 0.1);
                expect(tile.y + (SIZE + 5) * tile.scale).toBeLessThanOrEqual(BOX.y + BOX.height + 0.1);
            }
        }
    });

    it('makes one row for up to three tiles, and grows them no more than 1.2×', () => {
        const two = layoutFeatureTiles(five.slice(0, 2), BOX);
        expect(two[0].y).toBe(two[1].y);
        expect(layoutFeatureTiles(five.slice(0, 1), BOX)[0].scale).toBe(1.2);
    });

    it('shrinks the tiles to fit a small box', () => {
        const tiles = layoutFeatureTiles(five, { x: 8, y: 100, width: 40, height: 25 });
        expect(tiles[0].scale).toBeLessThan(0.5);
    });
});
