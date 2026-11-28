import { describe, expect, it } from 'vitest';

import {
    coverNameScale,
    graduatesStyleOf,
    showsGraduatePhoto,
    STICKER_ARRANGEMENTS,
    stickerArrangement,
    TITLE_STICKERS,
} from '@/lib/invitation/graduatesStyles';
import type { RenderContext } from '@/lib/invitation/render';

const ctx = (media: (id: string) => string | undefined, camera = false) =>
    ({ media, theme: { elements: [] }, canvasTools: camera ? { photo: () => null } : undefined }) as unknown as RenderContext;

describe('graduatesStyleOf', () => {
    it('draws a block without a style as plain', () => {
        expect(graduatesStyleOf({})).toBe('plain');
        expect(graduatesStyleOf({ style: 'cover' })).toBe('cover');
    });
});

describe('showsGraduatePhoto', () => {
    it('shows the photo shape when there is a photo or the host can add one', () => {
        const photo = { source: 'media' as const, mediaId: 'm-1' };
        expect(showsGraduatePhoto(photo, ctx(() => '/a.png'))).toBe(true);
        expect(showsGraduatePhoto(undefined, ctx(() => undefined))).toBe(false);
        expect(showsGraduatePhoto(undefined, ctx(() => undefined, true))).toBe(true);
    });
});

describe('stickers', () => {
    it('cycles the arrangements by position', () => {
        expect(stickerArrangement(0)).toBe(STICKER_ARRANGEMENTS[0]);
        expect(stickerArrangement(STICKER_ARRANGEMENTS.length)).toBe(STICKER_ARRANGEMENTS[0]);
        expect(stickerArrangement(1)).toBe(STICKER_ARRANGEMENTS[1]);
    });

    it('never puts two stickers in one corner', () => {
        for (const arrangement of [...STICKER_ARRANGEMENTS, TITLE_STICKERS]) {
            const spots = arrangement.map((sticker) => sticker.spot);
            expect(new Set(spots).size).toBe(spots.length);
        }
    });
});

describe('coverNameScale', () => {
    it('keeps short names full size and shrinks long ones, down to a floor', () => {
        expect(coverNameScale('Μαρία')).toBe(1);
        expect(coverNameScale('Αλεξάνδρα-Παναγιώτα')).toBeLessThan(1);
        expect(coverNameScale('Αλεξάνδρα-Παναγιώτα Παπαδημητροπούλου')).toBe(0.6);
    });
});
