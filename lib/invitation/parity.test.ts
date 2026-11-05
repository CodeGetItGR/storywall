import { describe, expect, it } from 'vitest';

import { comparePixels, readParityInput } from '@/lib/invitation/parity';

const pixels = (...values: number[][]) => Uint8Array.from(values.flat());

describe('comparePixels', () => {
    it('finds no difference between equal images', () => {
        const image = pixels([10, 20, 30, 255], [40, 50, 60, 255]);
        expect(comparePixels(image, image, 2, 1)).toMatchObject({ differing: 0, total: 2, percent: 0 });
    });

    it('ignores changes within the tolerance', () => {
        const a = pixels([100, 100, 100, 255]);
        const b = pixels([116, 84, 100, 255]);
        expect(comparePixels(a, b, 1, 1).differing).toBe(0);
    });

    it('counts and marks a pixel with any channel past the tolerance', () => {
        const a = pixels([0, 0, 0, 255], [0, 0, 0, 255]);
        const b = pixels([0, 0, 0, 255], [0, 17, 0, 255]);
        const diff = comparePixels(a, b, 2, 1);
        expect(diff).toMatchObject({ differing: 1, percent: 50 });
        expect(Array.from(diff.mask)).toEqual([0, 1]);
    });

    it('sees a missing area through its alpha', () => {
        expect(comparePixels(pixels([0, 0, 0, 0]), pixels([0, 0, 0, 255]), 1, 1).differing).toBe(1);
    });
});

describe('readParityInput', () => {
    it('stays off without the input file and in production', () => {
        expect(readParityInput({ NODE_ENV: 'development' } as NodeJS.ProcessEnv)).toBeUndefined();
        expect(readParityInput({ NODE_ENV: 'production', SMD_PARITY_INPUT: 'x.json' } as NodeJS.ProcessEnv)).toBeUndefined();
    });
});
