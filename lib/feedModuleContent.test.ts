import { describe, expect, it } from 'vitest';

import type { MediaResponseDto } from '@/lib/api/types';
import { feedMosaic, nearestSlide, wishCardTone } from '@/lib/feedModuleContent';

function item(id: string, over: Partial<MediaResponseDto> = {}): MediaResponseDto {
    return { id, mediaType: 'IMAGE', status: 'READY', mediaUrl: `https://cdn/${id}.jpg`, thumbnailUrl: null, ...over } as MediaResponseDto;
}

describe('feedMosaic', () => {
    it('takes the three newest items and counts the rest of the album', () => {
        const media = ['a', 'b', 'c', 'd'].map((id) => item(id));
        const { tiles, more } = feedMosaic(media, 24);
        expect(tiles.map((tile) => tile.id)).toEqual(['a', 'b', 'c']);
        expect(more).toBe(21);
    });

    it('skips videos still processing or that failed', () => {
        const media = [
            item('p', { mediaType: 'VIDEO', status: 'PROCESSING', mediaUrl: null }),
            item('f', { mediaType: 'VIDEO', status: 'FAILED', mediaUrl: null }),
            item('v', { mediaType: 'VIDEO', status: 'READY', thumbnailUrl: 'https://cdn/v.jpg' }),
        ];
        expect(feedMosaic(media, 3).tiles.map((tile) => tile.id)).toEqual(['v']);
    });

    it('has no +N while every item shows', () => {
        expect(feedMosaic([item('a'), item('b')], 2).more).toBe(0);
        expect(feedMosaic([], 0)).toEqual({ tiles: [], more: 0 });
    });
});

describe('nearestSlide', () => {
    it('picks the card whose centre is nearest', () => {
        expect(nearestSlide([100, 400, 700], 120)).toBe(0);
        expect(nearestSlide([100, 400, 700], 520)).toBe(1);
        expect(nearestSlide([100, 400, 700], 9000)).toBe(2);
    });
});

describe('wishCardTone', () => {
    it('takes turns through the tones', () => {
        expect(wishCardTone(0)).toBe(wishCardTone(3));
        expect(wishCardTone(0)).not.toBe(wishCardTone(1));
    });
});
