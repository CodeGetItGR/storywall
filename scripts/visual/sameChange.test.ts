// @vitest-environment node
import { describe, expect, it } from 'vitest';

import { comparePixels } from '../../lib/invitation/parity';
import { CHANNEL_TOLERANCE } from './config';
import type { Raw } from './images';
import { type ChangeSignature, changeSignature, groupChanges } from './sameChange';

type Color = [number, number, number, number?];
type Spot = { x: number; y: number; color: Color };

const SIZE = 64;
const WHITE: [number, number, number] = [255, 255, 255];
const halfway = ([r, g, b]: Color): Color => [(r + WHITE[0]) >> 1, (g + WHITE[1]) >> 1, (b + WHITE[2]) >> 1];
const INK: Color = [0x24, 0x1f, 0x1a];
const PURPLE: Color = [0x7c, 0x3a, 0xed];

function raw(spots: Spot[]): Raw {
    const data = new Uint8Array(SIZE * SIZE * 4).fill(255);
    for (const { x, y, color } of spots) data.set([color[0], color[1], color[2], color[3] ?? 255], (y * SIZE + x) * 4);
    return { data, width: SIZE, height: SIZE };
}

function diffOf(beforeSpots: Spot[], afterSpots: Spot[]) {
    const before = raw(beforeSpots);
    const after = raw(afterSpots);
    const { mask } = comparePixels(before.data, after.data, SIZE, SIZE, CHANNEL_TOLERANCE);
    return { before, after, mask, sizeChanged: false };
}

// A line of text in one color, with its anti-aliased edge below it, as a color token change leaves it.
function textLine(x: number, y: number, length: number, color: Color): Spot[] {
    const solid = Array.from({ length }, (_, index) => ({ x: x + index, y, color }));
    const edge = Array.from({ length }, (_, index) => ({ x: x + index, y: y + 1, color: halfway(color) }));
    return [...solid, ...edge];
}

const recolor = (x: number, y: number, length: number, extra: Spot[] = []) =>
    diffOf(textLine(x, y, length, INK), [...textLine(x, y, length, PURPLE), ...extra]);

// Two colors moving in different directions, so it can't be a color shift.
const patch = (x: number, y: number) =>
    diffOf(
        [],
        [
            { x, y, color: [255, 0, 0] },
            { x: x + 1, y, color: [0, 0, 255] },
        ],
    );

const signatureOf = (diff: Parameters<typeof changeSignature>[0]) => changeSignature(diff) as ChangeSignature;

describe('changeSignature', () => {
    it('finds a color shift', () => {
        expect(signatureOf(recolor(2, 2, 10)).shift).not.toBeNull();
    });

    it('finds no shift when one pixel falls outside it', () => {
        const stray: Spot = { x: 60, y: 60, color: [0, 255, 0] };
        expect(signatureOf(recolor(2, 2, 10, [stray])).shift).toBeNull();
    });

    it('finds no shift when a pixel changes its alpha', () => {
        const faded: Spot = { x: 2, y: 2, color: [PURPLE[0], PURPLE[1], PURPLE[2], 128] };
        expect(signatureOf(recolor(2, 2, 10, [faded])).shift).toBeNull();
    });

    it('finds no shift when no color moves far enough', () => {
        const small = diffOf(textLine(2, 2, 4, [100, 100, 100]), textLine(2, 2, 4, [110, 110, 110]));
        expect(signatureOf(small).shift).toBeNull();
    });

    it('has no signature when the size changed', () => {
        expect(changeSignature({ ...recolor(2, 2, 10), sizeChanged: true })).toBeNull();
    });

    it('hashes an area without its position', () => {
        expect(signatureOf(patch(2, 2)).areas).toEqual(signatureOf(patch(40, 30)).areas);
    });

    it('keeps areas that are far apart separate', () => {
        const spots: Spot[] = [
            { x: 2, y: 2, color: [255, 0, 0] },
            { x: 50, y: 50, color: [0, 0, 255] },
        ];
        expect(signatureOf(diffOf([], spots)).areas).toHaveLength(2);
    });

    it('merges changes in touching grid cells into one area', () => {
        const spots: Spot[] = [
            { x: 15, y: 2, color: [255, 0, 0] },
            { x: 16, y: 2, color: [0, 0, 255] },
        ];
        expect(signatureOf(diffOf([], spots)).areas).toHaveLength(1);
    });
});

describe('groupChanges', () => {
    const signed = (id: string, diff: Parameters<typeof changeSignature>[0]) => ({ id, signature: signatureOf(diff) });
    const shift = { direction: [1, 0, 0] as [number, number, number], pair: 0xffffff };

    it('groups captures with one color shift, however different they look', () => {
        const { groups, keys } = groupChanges([signed('a', recolor(2, 2, 10)), signed('b', recolor(5, 30, 20))]);
        expect(groups).toEqual([{ key: 'color-1', kind: 'color', from: '#241f1a', to: '#7c3aed' }]);
        expect(keys.get('a')).toBe('color-1');
        expect(keys.get('b')).toBe('color-1');
    });

    it('keeps a capture with a stray pixel out of the color group', () => {
        const stray: Spot = { x: 60, y: 60, color: [0, 255, 0] };
        const { keys } = groupChanges([signed('a', recolor(2, 2, 10)), signed('b', recolor(5, 30, 20)), signed('c', recolor(9, 9, 6, [stray]))]);
        expect(keys.get('c')).toBeUndefined();
        expect(keys.get('a')).toBe('color-1');
    });

    it('groups identical areas, even when they moved', () => {
        const { groups, keys } = groupChanges([signed('a', patch(2, 2)), signed('b', patch(40, 30))]);
        expect(groups).toEqual([{ key: 'same-1', kind: 'exact' }]);
        expect(keys.get('a')).toBe('same-1');
    });

    it('has no groups of one', () => {
        const { groups, keys } = groupChanges([signed('a', recolor(2, 2, 10)), signed('b', patch(2, 2))]);
        expect(groups).toEqual([]);
        expect(keys.size).toBe(0);
    });

    it('counts an area each time it appears', () => {
        const { groups } = groupChanges([
            { id: 'a', signature: { shift: null, areas: ['x', 'x'] } },
            { id: 'b', signature: { shift: null, areas: ['x'] } },
        ]);
        expect(groups).toEqual([]);
    });

    it('compares a color group of one by its areas', () => {
        const { keys } = groupChanges([
            { id: 'a', signature: { shift, areas: ['x'] } },
            { id: 'b', signature: { shift: null, areas: ['x'] } },
        ]);
        expect(keys.get('a')).toBe('same-1');
        expect(keys.get('b')).toBe('same-1');
    });

    it('numbers groups largest first', () => {
        const { groups, keys } = groupChanges([
            { id: 'a', signature: { shift: null, areas: ['small'] } },
            { id: 'b', signature: { shift: null, areas: ['small'] } },
            { id: 'c', signature: { shift: null, areas: ['big'] } },
            { id: 'd', signature: { shift: null, areas: ['big'] } },
            { id: 'e', signature: { shift: null, areas: ['big'] } },
        ]);
        expect(groups.map((group) => group.key)).toEqual(['same-1', 'same-2']);
        expect(keys.get('c')).toBe('same-1');
        expect(keys.get('a')).toBe('same-2');
    });

    it('gives the same result in any order', () => {
        const items = [signed('a', recolor(2, 2, 10)), signed('b', recolor(5, 30, 20)), signed('c', patch(2, 2)), signed('d', patch(40, 30))];
        const forward = groupChanges(items);
        const backward = groupChanges([...items].reverse());
        expect(backward.groups).toEqual(forward.groups);
        expect([...backward.keys].sort()).toEqual([...forward.keys].sort());
    });
});
