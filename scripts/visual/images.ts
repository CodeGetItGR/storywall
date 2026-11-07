import { createHash } from 'node:crypto';

import sharp from 'sharp';

export type Raw = { data: Uint8Array; width: number; height: number };

const WEBP_MAX_SIDE = 16000;
const PREVIEW_PART_WIDTH = 294;
const PREVIEW_PART_MAX_HEIGHT = 600;
const PREVIEW_GAP = 12;

const fromRaw = ({ data, width, height }: Raw) => sharp(Buffer.from(data), { raw: { width, height, channels: 4 } });

export async function decodePng(png: Buffer): Promise<Raw> {
    const { data, info } = await sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    return { data, width: info.width, height: info.height };
}

// Hashes decoded pixels, so a different PNG encoding of the same image hashes the same.
export function hashRaw({ data, width, height }: Raw): string {
    return createHash('sha256').update(`${width}x${height}:`).update(data).digest('hex');
}

export async function padRaw(raw: Raw, width: number, height: number): Promise<Raw> {
    if (raw.width === width && raw.height === height) return raw;
    const { data } = await fromRaw(raw)
        .extend({ right: width - raw.width, bottom: height - raw.height, background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .raw()
        .toBuffer({ resolveWithObject: true });
    return { data, width, height };
}

// Differing pixels in red over a faded copy of the image.
export function diffImage(base: Raw, mask: Uint8Array): Raw {
    const data = new Uint8Array(base.data.length);
    for (let i = 0; i < mask.length; i += 1) {
        const p = i * 4;
        if (mask[i]) {
            data[p] = 255;
            data[p + 1] = 0;
            data[p + 2] = 0;
        } else {
            data[p] = 255 - (255 - base.data[p]) * 0.25;
            data[p + 1] = 255 - (255 - base.data[p + 1]) * 0.25;
            data[p + 2] = 255 - (255 - base.data[p + 2]) * 0.25;
        }
        data[p + 3] = 255;
    }
    return { data, width: base.width, height: base.height };
}

export function rawToWebp(raw: Raw): Promise<Buffer> {
    return fromRaw(raw)
        .resize({ width: WEBP_MAX_SIDE, height: WEBP_MAX_SIDE, fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 80 })
        .toBuffer();
}

// One or two images side by side, 600px wide, for the PR comment.
export async function makePreview(parts: Raw[]): Promise<Buffer> {
    const images = await Promise.all(
        parts.map((part) =>
            fromRaw(part)
                .resize({ width: PREVIEW_PART_WIDTH, height: PREVIEW_PART_MAX_HEIGHT, fit: 'inside', withoutEnlargement: true })
                .png()
                .toBuffer({ resolveWithObject: true }),
        ),
    );
    const height = Math.max(...images.map((image) => image.info.height));
    return sharp({ create: { width: PREVIEW_PART_WIDTH * 2 + PREVIEW_GAP, height, channels: 4, background: '#e5e5e5' } })
        .composite(images.map((image, index) => ({ input: image.data, left: index * (PREVIEW_PART_WIDTH + PREVIEW_GAP), top: 0 })))
        .webp({ quality: 80 })
        .toBuffer();
}
