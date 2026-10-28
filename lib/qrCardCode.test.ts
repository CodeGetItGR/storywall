import { encode } from 'uqr';
import { describe, expect, it } from 'vitest';

import { logoSpan, qrCodePath, qrModules } from '@/lib/qrCardCode';

const URL = 'https://storywall.gr/q/AbCdEf123456';
const RUN = /M(\d+) (\d+)h(\d+)v1h-(\d+)z/g;

// The cells a path draws, as "row,col", read back from its row runs.
function drawnCells(d: string): Set<string> {
    const cells = new Set<string>();
    for (const [, x, y, width] of d.matchAll(RUN)) {
        for (let col = Number(x); col < Number(x) + Number(width); col++) cells.add(`${y},${col}`);
    }
    return cells;
}

// The dark cells uqr encodes, as "row,col", minus any the filter drops.
function encodedCells(ecc: 'Q' | 'H', keep: (row: number, col: number) => boolean = () => true): Set<string> {
    const { data } = encode(URL, { ecc, border: 0 });
    const cells = new Set<string>();
    data.forEach((cols, row) => cols.forEach((dark, col) => dark && keep(row, col) && cells.add(`${row},${col}`)));
    return cells;
}

describe('qrModules', () => {
    it('keeps the finder patterns as dark modules', () => {
        const { size, isDark } = qrModules(URL, false);
        for (const [row, col] of [
            [0, 0],
            [6, 6],
            [2, 2],
            [0, size - 1],
            [size - 1, 0],
        ]) {
            expect(isDark(row, col), `${row},${col}`).toBe(true);
        }
        for (const [row, col] of [
            [1, 1],
            [5, 5],
            [7, 0],
        ]) {
            expect(isDark(row, col), `${row},${col}`).toBe(false);
        }
    });

    it('centres the logo and clears a one-module ring around it', () => {
        const { size, isDark, logo } = qrModules(URL, true);
        expect(logo).not.toBeNull();
        const { start, span } = logo!;
        expect(span % 2).toBe(1);
        expect(start + (span - 1) / 2).toBe((size - 1) / 2);
        for (let row = start - 1; row <= start + span; row++) {
            for (let col = start - 1; col <= start + span; col++) expect(isDark(row, col), `${row},${col}`).toBe(false);
        }
    });

    it('has no logo square without the logo', () => {
        expect(qrModules(URL, false).logo).toBeNull();
    });
});

describe('logoSpan', () => {
    it.each([
        [21, 3],
        [25, 5],
        [29, 5],
        [57, 11],
    ])('gives a %i-module code a %i-module logo', (size, span) => {
        expect(logoSpan(size)).toBe(span);
    });
});

describe('qrCodePath', () => {
    it('is only whole-module row runs', () => {
        const { d } = qrCodePath(URL, { centerLogo: true });
        expect(d.length).toBeGreaterThan(0);
        expect(d.replace(RUN, '')).toBe('');
    });

    it('starts with the top-left finder pattern’s top edge as one run', () => {
        expect(qrCodePath(URL, { centerLogo: false }).d.startsWith('M0 0h7v1h-7z')).toBe(true);
    });

    it('draws exactly the encoded modules, x as the column and y as the row', () => {
        const { size, d } = qrCodePath(URL, { centerLogo: false });
        expect(size).toBe(encode(URL, { ecc: 'Q', border: 0 }).size);
        expect(drawnCells(d)).toEqual(encodedCells('Q'));
    });

    it('is not transposed', () => {
        const { data } = encode(URL, { ecc: 'Q', border: 0 });
        const cells = drawnCells(qrCodePath(URL, { centerLogo: false }).d);
        let checked = 0;
        data.forEach((cols, row) =>
            cols.forEach((dark, col) => {
                if (!dark || data[col][row]) return;
                // Dark at (row, col) but light at (col, row): only the right orientation draws it.
                expect(cells.has(`${row},${col}`), `${row},${col}`).toBe(true);
                expect(cells.has(`${col},${row}`), `${col},${row}`).toBe(false);
                checked++;
            }),
        );
        expect(checked).toBeGreaterThan(0);
    });

    it('draws the encoded modules around the cleared logo square', () => {
        const { d, logo } = qrCodePath(URL, { centerLogo: true });
        const { start, span } = logo!;
        const isCleared = (row: number, col: number) => row >= start - 1 && row <= start + span && col >= start - 1 && col <= start + span;
        expect(drawnCells(d)).toEqual(encodedCells('H', (row, col) => !isCleared(row, col)));
    });
});
