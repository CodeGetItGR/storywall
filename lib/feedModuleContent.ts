import type { MediaResponseDto } from '@/lib/api/types';

// The feed's Gallery block (KAN-299, look G2): one big tile and two small ones.
export const FEED_MOSAIC_TILES = 3;
// The feed's Wishbook block (look C1): the newest wishes, one card each.
export const FEED_WISH_CARDS = 5;

// A tile shows a photo, or a video's still: a video still processing or that failed has nothing to show yet.
function isShowable(item: MediaResponseDto): boolean {
    return item.mediaType === 'VIDEO' ? item.status === 'READY' : Boolean(item.mediaUrl);
}

// The mosaic's tiles, newest first, and how many items of the album they leave out (the last tile's +N).
export function feedMosaic(media: readonly MediaResponseDto[], total: number): { tiles: MediaResponseDto[]; more: number } {
    const tiles = media.filter(isShowable).slice(0, FEED_MOSAIC_TILES);
    return { tiles, more: Math.max(0, total - tiles.length) };
}

// The slide whose centre is nearest the scroller's centre: the card the dots mark.
export function nearestSlide(centres: readonly number[], target: number): number {
    let best = 0;
    centres.forEach((centre, index) => {
        if (Math.abs(centre - target) < Math.abs(centres[best] - target)) best = index;
    });
    return best;
}

// The quote cards take turns on these soft backgrounds (C1: cream, then pink, then mint).
const WISH_CARD_TONES = ['bg-[#fdf4df]', 'bg-[#fce6ea]', 'bg-[#e5f3ec]'] as const;

export function wishCardTone(index: number): string {
    return WISH_CARD_TONES[index % WISH_CARD_TONES.length];
}
