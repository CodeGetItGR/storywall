// @vitest-environment node
import sharp from 'sharp';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { cropSharePhoto, SHARE_IMAGE_MAX_BYTES, shareJpeg } from '@/lib/og/sharePhoto';

const fetchMock = vi.fn();

function serve(bytes: Buffer, type = 'image/webp') {
    fetchMock.mockResolvedValue(new Response(new Uint8Array(bytes), { headers: { 'Content-Type': type } }));
}

// A tall photo with red on its upper half and blue below, like a portrait whose faces are up top.
async function tall() {
    const red = await sharp({ create: { width: 800, height: 800, channels: 3, background: '#ff0000' } }).png().toBuffer();
    return sharp({ create: { width: 800, height: 1600, channels: 3, background: '#0000ff' } })
        .composite([{ input: red, left: 0, top: 0 }])
        .webp()
        .toBuffer();
}

// A wide photo: red, green and blue thirds.
async function wide() {
    const third = (background: string) => sharp({ create: { width: 1000, height: 400, channels: 3, background } }).png().toBuffer();
    return sharp({ create: { width: 3000, height: 400, channels: 3, background: '#000000' } })
        .composite([
            { input: await third('#ff0000'), left: 0, top: 0 },
            { input: await third('#00ff00'), left: 1000, top: 0 },
            { input: await third('#0000ff'), left: 2000, top: 0 },
        ])
        .webp()
        .toBuffer();
}

// Random noise compresses badly, the worst case for the size limit.
async function noise(width: number, height: number) {
    const pixels = Buffer.alloc(width * height * 3);
    for (let index = 0; index < pixels.length; index += 1) pixels[index] = Math.floor(Math.random() * 256);
    return sharp(pixels, { raw: { width, height, channels: 3 } }).png().toBuffer();
}

async function dominant(jpeg: Buffer) {
    return (await sharp(jpeg).stats()).dominant;
}

beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
    vi.unstubAllGlobals();
});

describe('cropSharePhoto', () => {
    it('fills 1200×630 and keeps the upper third of a tall photo', async () => {
        serve(await tall());
        const jpeg = (await cropSharePhoto('https://r2/p.webp')) as Buffer;
        expect(await sharp(jpeg).metadata()).toMatchObject({ width: 1200, height: 630, format: 'jpeg' });
        const { dominant } = await sharp(jpeg).stats();
        expect(dominant.r).toBeGreaterThan(200);
        expect(dominant.b).toBeLessThan(50);
    });

    it('keeps the middle of a wide photo', async () => {
        serve(await wide());
        const { dominant } = await sharp((await cropSharePhoto('https://r2/p.webp')) as Buffer).stats();
        expect(dominant.g).toBeGreaterThan(200);
        expect(dominant.r).toBeLessThan(50);
    });

    it('keeps a busy photo under the size limit', async () => {
        serve(await noise(1600, 1200), 'image/png');
        const jpeg = (await cropSharePhoto('https://r2/p.png')) as Buffer;
        expect(jpeg.length).toBeLessThanOrEqual(SHARE_IMAGE_MAX_BYTES);
    });

    it('puts a transparent picture on white', async () => {
        serve(await sharp({ create: { width: 1200, height: 630, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).png().toBuffer(), 'image/png');
        const jpeg = (await cropSharePhoto('https://r2/p.png')) as Buffer;
        expect((await dominant(jpeg)).r).toBeGreaterThan(240);
    });

    it('gives up on a failed, non-image or unreadable answer', async () => {
        fetchMock.mockResolvedValue(new Response(null, { status: 403 }));
        expect(await cropSharePhoto('https://r2/p.webp')).toBeNull();
        fetchMock.mockResolvedValue(new Response('<html/>', { headers: { 'Content-Type': 'text/html' } }));
        expect(await cropSharePhoto('https://r2/p.webp')).toBeNull();
        fetchMock.mockResolvedValue(new Response('not a picture', { headers: { 'Content-Type': 'image/webp' } }));
        expect(await cropSharePhoto('https://r2/p.webp')).toBeNull();
        fetchMock.mockRejectedValue(new Error('offline'));
        expect(await cropSharePhoto('https://r2/p.webp')).toBeNull();
    });
});

describe('shareJpeg', () => {
    it('keeps the best quality that fits', async () => {
        const plain = await shareJpeg(sharp({ create: { width: 1200, height: 630, channels: 3, background: '#808080' } }));
        const best = await sharp({ create: { width: 1200, height: 630, channels: 3, background: '#808080' } }).jpeg({ quality: 82, mozjpeg: true }).toBuffer();
        expect(plain.equals(best)).toBe(true);
    });
});
