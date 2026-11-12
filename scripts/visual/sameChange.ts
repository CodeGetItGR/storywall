import { createHash } from 'node:crypto';

import type { ImageDiff } from './compare';
import type { ChangeGroup } from './types';

// Measured on a report with 614 changed captures. See the design: docs/superpowers/specs/2026-11-07-visual-report-page-design.md
const MIN_PAIR_DISTANCE = 48;
const MAX_RESIDUAL = 16;
const SAME_DIRECTION = 0.995;
const CELL = 16;

// One color change has at most a few thousand strong pairs. Photo-like changes have far more, and stop here.
const MAX_STRONG_PAIRS = 65_536;

// A before and after color, as one number: before * PAIR_BASE + after.
const PAIR_BASE = 2 ** 24;

type Vector = [number, number, number];
type Box = { x0: number; y0: number; x1: number; y1: number };
type ChangedCapture = Pick<ImageDiff, 'before' | 'after' | 'mask' | 'sizeChanged'>;

export type ColorShift = { direction: Vector; pair: number };
export type ChangeSignature = { shift: ColorShift | null; areas: string[] };
export type SignedCapture = { id: string; signature: ChangeSignature };

const rgbAt = (data: Uint8Array, offset: number) => (data[offset] << 16) | (data[offset + 1] << 8) | data[offset + 2];
const channels = (rgb: number): Vector => [(rgb >> 16) & 255, (rgb >> 8) & 255, rgb & 255];
const hex = (rgb: number) => `#${rgb.toString(16).padStart(6, '0')}`;
const beforeOf = (pair: number) => Math.floor(pair / PAIR_BASE);
const afterOf = (pair: number) => pair % PAIR_BASE;
const dot = (a: Vector, b: Vector) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

function deltaOf(pair: number): Vector {
    const from = channels(beforeOf(pair));
    const to = channels(afterOf(pair));
    return [to[0] - from[0], to[1] - from[1], to[2] - from[2]];
}

function isStrong(pair: number): boolean {
    const delta = deltaOf(pair);
    return dot(delta, delta) >= MIN_PAIR_DISTANCE ** 2;
}

// Ties go to the lower pair value, so results don't depend on order.
function mostCommon(counts: Map<number, number>): number | null {
    let top: number | null = null;
    let topCount = 0;
    for (const [pair, count] of counts) {
        if (count > topCount || (count === topCount && top !== null && pair < top)) {
            top = pair;
            topCount = count;
        }
    }
    return top;
}

function fits(pair: number, direction: Vector): boolean {
    const delta = deltaOf(pair);
    const along = dot(delta, direction);
    if (along < 0) return false;
    return delta.every((value, channel) => Math.abs(value - along * direction[channel]) <= MAX_RESIDUAL);
}

// Counts the strong pairs over the changed pixels. Null means the capture can't be one color change.
function strongPairs({ before, after, mask }: ChangedCapture): Map<number, number> | null {
    const counts = new Map<number, number>();
    let firstBefore = -1;
    let firstAfter = -1;
    let beforeVaries = false;
    let afterVaries = false;
    let lastPair = -1;
    let lastStrong = false;
    for (let index = 0; index < mask.length; index += 1) {
        if (!mask[index]) continue;
        const offset = index * 4;
        if (before.data[offset + 3] !== after.data[offset + 3]) return null;
        const from = rgbAt(before.data, offset);
        const to = rgbAt(after.data, offset);
        if (firstBefore < 0) {
            firstBefore = from;
            firstAfter = to;
        }
        if (from !== firstBefore) beforeVaries = true;
        if (to !== firstAfter) afterVaries = true;
        const pair = from * PAIR_BASE + to;
        if (pair !== lastPair) {
            lastPair = pair;
            lastStrong = isStrong(pair);
        }
        if (!lastStrong) continue;
        counts.set(pair, (counts.get(pair) ?? 0) + 1);
        if (counts.size > MAX_STRONG_PAIRS) return null;
    }
    // One side in a single color is content added to a plain background, or removed from one.
    if (beforeVaries !== afterVaries) return null;
    return counts;
}

function everyPixelFits({ before, after, mask }: ChangedCapture, direction: Vector): boolean {
    let lastPair = -1;
    for (let index = 0; index < mask.length; index += 1) {
        if (!mask[index]) continue;
        const offset = index * 4;
        const pair = rgbAt(before.data, offset) * PAIR_BASE + rgbAt(after.data, offset);
        if (pair === lastPair) continue;
        lastPair = pair;
        if (!fits(pair, direction)) return false;
    }
    return true;
}

function colorShift(capture: ChangedCapture): ColorShift | null {
    const counts = strongPairs(capture);
    const top = counts ? mostCommon(counts) : null;
    if (top === null) return null;
    const delta = deltaOf(top);
    const length = Math.hypot(...delta);
    const direction: Vector = [delta[0] / length, delta[1] / length, delta[2] / length];
    return everyPixelFits(capture, direction) ? { direction, pair: top } : null;
}

function cellBoxes({ before, mask }: ChangedCapture): { boxes: Map<number, Box>; columns: number; rows: number } {
    const { width, height } = before;
    const columns = Math.ceil(width / CELL);
    const rows = Math.ceil(height / CELL);
    const boxes = new Map<number, Box>();
    for (let y = 0; y < height; y += 1) {
        for (let x = 0; x < width; x += 1) {
            if (!mask[y * width + x]) continue;
            const cell = Math.floor(y / CELL) * columns + Math.floor(x / CELL);
            const box = boxes.get(cell);
            if (box) {
                box.x0 = Math.min(box.x0, x);
                box.y0 = Math.min(box.y0, y);
                box.x1 = Math.max(box.x1, x);
                box.y1 = Math.max(box.y1, y);
            } else {
                boxes.set(cell, { x0: x, y0: y, x1: x, y1: y });
            }
        }
    }
    return { boxes, columns, rows };
}

function hashArea({ before, after }: ChangedCapture, box: Box): string {
    const hash = createHash('sha1');
    const areaWidth = box.x1 - box.x0 + 1;
    hash.update(`${areaWidth}x${box.y1 - box.y0 + 1}:`);
    for (const { data, width } of [before, after]) {
        for (let y = box.y0; y <= box.y1; y += 1) {
            const start = (y * width + box.x0) * 4;
            hash.update(data.subarray(start, start + areaWidth * 4));
        }
    }
    return hash.digest('hex');
}

// Unchanged pixels between two boxes, on the axis where they're furthest apart.
function gapBetween(a: Box, b: Box): number {
    const gapX = Math.max(0, b.x0 - a.x1 - 1, a.x0 - b.x1 - 1);
    const gapY = Math.max(0, b.y0 - a.y1 - 1, a.y0 - b.y1 - 1);
    return Math.max(gapX, gapY);
}

// Changed pixels less than CELL apart join into one area wherever they sit, so the letters of one word become one area.
// Pixels in one grid cell are always that close and pixels two cells apart never are, so only neighboring cells are compared.
// The gap is measured between the boxes around each cell's changed pixels, so a diagonal neighbor can now and then join early.
function changedAreas(capture: ChangedCapture): string[] {
    const { boxes, columns, rows } = cellBoxes(capture);
    const seen = new Set<number>();
    const hashes: string[] = [];
    for (const start of boxes.keys()) {
        if (seen.has(start)) continue;
        seen.add(start);
        const stack = [start];
        const area = { ...(boxes.get(start) as Box) };
        while (stack.length > 0) {
            const cell = stack.pop() as number;
            const box = boxes.get(cell) as Box;
            area.x0 = Math.min(area.x0, box.x0);
            area.y0 = Math.min(area.y0, box.y0);
            area.x1 = Math.max(area.x1, box.x1);
            area.y1 = Math.max(area.y1, box.y1);
            const row = Math.floor(cell / columns);
            const column = cell % columns;
            for (let dy = -1; dy <= 1; dy += 1) {
                for (let dx = -1; dx <= 1; dx += 1) {
                    const nextRow = row + dy;
                    const nextColumn = column + dx;
                    if (nextRow < 0 || nextColumn < 0 || nextRow >= rows || nextColumn >= columns) continue;
                    const next = nextRow * columns + nextColumn;
                    const nextBox = boxes.get(next);
                    if (nextBox && !seen.has(next) && gapBetween(box, nextBox) < CELL) {
                        seen.add(next);
                        stack.push(next);
                    }
                }
            }
        }
        hashes.push(hashArea(capture, area));
    }
    return hashes.sort();
}

// What grouping needs from a capture's pixels, so the pixels can be released before the rest are read.
export function changeSignature(capture: ChangedCapture): ChangeSignature | null {
    if (capture.sizeChanged) return null;
    return { shift: colorShift(capture), areas: changedAreas(capture) };
}

const byId = (a: SignedCapture, b: SignedCapture) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
const largestFirst = (a: SignedCapture[], b: SignedCapture[]) => b.length - a.length || byId(a[0], b[0]);

function colorGroups(captures: SignedCapture[]): SignedCapture[][] {
    const found: { direction: Vector; members: SignedCapture[] }[] = [];
    for (const capture of captures) {
        const shift = capture.signature.shift;
        if (!shift) continue;
        const home = found.find((group) => dot(group.direction, shift.direction) >= SAME_DIRECTION);
        if (home) home.members.push(capture);
        else found.push({ direction: shift.direction, members: [capture] });
    }
    return found
        .map((group) => group.members)
        .filter((members) => members.length >= 2)
        .sort(largestFirst);
}

function exactGroups(captures: SignedCapture[]): SignedCapture[][] {
    const found = new Map<string, SignedCapture[]>();
    for (const capture of captures) {
        if (capture.signature.areas.length === 0) continue;
        const key = capture.signature.areas.join('+');
        const members = found.get(key);
        if (members) members.push(capture);
        else found.set(key, [capture]);
    }
    return [...found.values()].filter((members) => members.length >= 2).sort(largestFirst);
}

function topPair(members: SignedCapture[]): number {
    const counts = new Map<number, number>();
    for (const { signature } of members) {
        const pair = (signature.shift as ColorShift).pair;
        counts.set(pair, (counts.get(pair) ?? 0) + 1);
    }
    return mostCommon(counts) as number;
}

export function groupChanges(captures: SignedCapture[]): { groups: ChangeGroup[]; keys: Map<string, string> } {
    const ordered = [...captures].sort(byId);
    const groups: ChangeGroup[] = [];
    const keys = new Map<string, string>();
    colorGroups(ordered).forEach((members, index) => {
        const key = `color-${index + 1}`;
        const pair = topPair(members);
        groups.push({ key, kind: 'color', from: hex(beforeOf(pair)), to: hex(afterOf(pair)) });
        for (const { id } of members) keys.set(id, key);
    });
    exactGroups(ordered.filter(({ id }) => !keys.has(id))).forEach((members, index) => {
        const key = `same-${index + 1}`;
        groups.push({ key, kind: 'exact' });
        for (const { id } of members) keys.set(id, key);
    });
    return { groups, keys };
}
