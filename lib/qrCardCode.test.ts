import { describe, expect, it } from 'vitest';

import { isFinderModule, logoSpan, qrCodePaths, qrModules } from '@/lib/qrCardCode';

const URL = 'https://storywall.gr/q/AbCdEf123456';

function darkDataCount(text: string, centerLogo: boolean): number {
    const { size, isDataDark } = qrModules(text, centerLogo);
    let count = 0;
    for (let row = 0; row < size; row++) {
        for (let col = 0; col < size; col++) if (isDataDark(row, col)) count++;
    }
    return count;
}

describe('qrModules', () => {
    it('leaves the three finder patterns out of the data modules', () => {
        const { size, isDataDark } = qrModules(URL, false);
        for (const [row, col] of [
            [0, 0],
            [6, 6],
            [0, size - 1],
            [size - 1, 0],
            [3, size - 4],
        ]) {
            expect(isDataDark(row, col), `${row},${col}`).toBe(false);
        }
        expect(isFinderModule(size, size - 1, size - 1)).toBe(false);
    });

    it('centres the logo and clears a one-module ring around it', () => {
        const { size, isDataDark, logo } = qrModules(URL, true);
        expect(logo).not.toBeNull();
        const { start, span } = logo!;
        expect(span % 2).toBe(1);
        expect(start + (span - 1) / 2).toBe((size - 1) / 2);
        for (let row = start - 1; row <= start + span; row++) {
            for (let col = start - 1; col <= start + span; col++) expect(isDataDark(row, col), `${row},${col}`).toBe(false);
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

describe('qrCodePaths', () => {
    it('covers every dark data module with square runs', () => {
        const paths = qrCodePaths(URL, { dotShape: 'SQUARE', cornerShape: 'SQUARE', centerLogo: true });
        const covered = [...paths.dots.matchAll(/h(\d+)v1/g)].reduce((sum, match) => sum + Number(match[1]), 0);
        expect(covered).toBe(darkDataCount(URL, true));
    });

    it.each(['ROUNDED', 'DOT'] as const)('draws one %s shape per dark data module', (dotShape) => {
        const paths = qrCodePaths(URL, { dotShape, cornerShape: 'SQUARE', centerLogo: false });
        expect(paths.dots.match(/M/g)?.length).toBe(darkDataCount(URL, false));
    });

    it.each(['SQUARE', 'ROUNDED', 'CIRCLE'] as const)('draws three %s finder patterns of three rings each', (cornerShape) => {
        const paths = qrCodePaths(URL, { dotShape: 'SQUARE', cornerShape, centerLogo: false });
        expect(paths.corners.match(/M/g)?.length).toBe(9);
    });

    it('writes no float noise into the paths', () => {
        const { dots, corners } = qrCodePaths(URL, { dotShape: 'ROUNDED', cornerShape: 'ROUNDED', centerLogo: true });
        expect(dots + corners).not.toMatch(/\d\.\d{4,}/);
    });
});
