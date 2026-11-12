import { comparePixels } from '../../lib/invitation/parity';
import { CHANNEL_TOLERANCE, PIXEL_BUDGET } from './config';
import { decodePng, padRaw, type Raw } from './images';

export type ImageDiff = { before: Raw; after: Raw; mask: Uint8Array; differing: number; percent: number; sizeChanged: boolean };

export async function comparePngs(beforePng: Buffer, afterPng: Buffer): Promise<ImageDiff> {
    const [rawBefore, rawAfter] = await Promise.all([decodePng(beforePng), decodePng(afterPng)]);
    const width = Math.max(rawBefore.width, rawAfter.width);
    const height = Math.max(rawBefore.height, rawAfter.height);
    const [before, after] = await Promise.all([padRaw(rawBefore, width, height), padRaw(rawAfter, width, height)]);
    const { mask, differing, percent } = comparePixels(before.data, after.data, width, height, CHANNEL_TOLERANCE);
    return { before, after, mask, differing, percent, sizeChanged: rawBefore.width !== rawAfter.width || rawBefore.height !== rawAfter.height };
}

export const isChanged = (diff: ImageDiff) => diff.sizeChanged || diff.differing > PIXEL_BUDGET;
