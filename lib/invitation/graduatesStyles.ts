import type { ImageRef } from '@/lib/invitation/primitives';
import { type RenderContext, resolveImage } from '@/lib/invitation/render';
import type { GraduatesStyle } from '@/lib/invitation/sections';

// The Graduates block's looks (KAN-302): which one a block draws, and the fixed parts of each.

export function graduatesStyleOf(data: { style?: GraduatesStyle }): GraduatesStyle {
    return data.style ?? 'plain';
}

// Guests see a photo only when there is one; a host editing the feed also sees the empty
// shape, to add one.
export function showsGraduatePhoto(photo: ImageRef | undefined, ctx: RenderContext): boolean {
    return Boolean(resolveImage(photo, ctx) || ctx.canvasTools?.photo);
}

// The sticker kinds match the invitation labels that name them.
export type StickerKind = 'diploma' | 'books' | 'champagne' | 'star' | 'confetti';
export type StickerSpot = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
export type StickerPlacement = { kind: StickerKind; spot: StickerSpot; tilt: number };

// Around each photo, by the graduate's place in the list. Hosts can't move them.
export const STICKER_ARRANGEMENTS: readonly (readonly StickerPlacement[])[] = [
    [
        { kind: 'diploma', spot: 'top-right', tilt: 12 },
        { kind: 'star', spot: 'bottom-left', tilt: 18 },
    ],
    [
        { kind: 'books', spot: 'top-right', tilt: -8 },
        { kind: 'champagne', spot: 'bottom-left', tilt: -14 },
    ],
    [
        { kind: 'books', spot: 'top-left', tilt: 8 },
        { kind: 'star', spot: 'top-right', tilt: -10 },
        { kind: 'confetti', spot: 'bottom-right', tilt: 0 },
    ],
];

// Around the block's title.
export const TITLE_STICKERS: readonly StickerPlacement[] = [
    { kind: 'star', spot: 'top-left', tilt: -12 },
    { kind: 'confetti', spot: 'top-right', tilt: 0 },
];

export function stickerArrangement(index: number): readonly StickerPlacement[] {
    return STICKER_ARRANGEMENTS[index % STICKER_ARRANGEMENTS.length];
}

// A cover name shrinks to fit the card before it wraps: full size up to 12 letters, never
// below 60%.
const FULL_SIZE_LETTERS = 12;
const SMALLEST_NAME = 0.6;

export function coverNameScale(name: string): number {
    const letters = name.trim().length;
    if (letters <= FULL_SIZE_LETTERS) return 1;
    return Math.max(SMALLEST_NAME, Math.round((FULL_SIZE_LETTERS / letters) * 100) / 100);
}
