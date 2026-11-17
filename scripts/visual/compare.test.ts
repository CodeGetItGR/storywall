// @vitest-environment node
import sharp from 'sharp';
import { describe, expect, it } from 'vitest';

import { comparePngs, isChanged } from './compare';
import { decodePng, hashRaw } from './images';

const solid = (r: number, g: number, b: number, width = 20, height = 20) =>
    sharp({ create: { width, height, channels: 4, background: { r, g, b, alpha: 1 } } })
        .png()
        .toBuffer();

async function withDots(count: number) {
    const dot = await solid(0, 0, 0, 1, 1);
    return sharp(await solid(255, 255, 255))
        .composite(Array.from({ length: count }, (_, index) => ({ input: dot, left: index, top: 0 })))
        .png()
        .toBuffer();
}

describe('comparePngs', () => {
    it('treats identical images as unchanged', async () => {
        expect(isChanged(await comparePngs(await solid(10, 10, 10), await solid(10, 10, 10)))).toBe(false);
    });

    it('catches a subtle colour change the old default tolerance would miss', async () => {
        expect(isChanged(await comparePngs(await solid(244, 244, 245), await solid(250, 250, 250)))).toBe(true);
    });

    it('ignores a change within the channel tolerance', async () => {
        expect(isChanged(await comparePngs(await solid(100, 100, 100), await solid(102, 102, 102)))).toBe(false);
    });

    it('allows up to the pixel budget', async () => {
        const white = await solid(255, 255, 255);
        expect(isChanged(await comparePngs(white, await withDots(10)))).toBe(false);
        expect(isChanged(await comparePngs(white, await withDots(11)))).toBe(true);
    });

    it('counts a size change as changed, even when the pixels match', async () => {
        const diff = await comparePngs(await solid(0, 0, 0, 20, 20), await solid(0, 0, 0, 20, 21));
        expect(diff.sizeChanged).toBe(true);
        expect(isChanged(diff)).toBe(true);
    });
});

describe('hashRaw', () => {
    it('is the same for the same pixels and differs for other pixels', async () => {
        const first = hashRaw(await decodePng(await solid(1, 2, 3)));
        expect(hashRaw(await decodePng(await solid(1, 2, 3)))).toBe(first);
        expect(hashRaw(await decodePng(await solid(1, 2, 4)))).not.toBe(first);
    });

    it('differs for the same pixels in another shape', async () => {
        const wide = hashRaw(await decodePng(await solid(1, 2, 3, 40, 10)));
        const tall = hashRaw(await decodePng(await solid(1, 2, 3, 10, 40)));
        expect(wide).not.toBe(tall);
    });
});
