// @vitest-environment node
import { describe, expect, it } from 'vitest';

import { allFailedSoFar } from './capture';

describe('allFailedSoFar', () => {
    it('is true when the first 20 captures all failed', () => {
        expect(allFailedSoFar(20, 20)).toBe(true);
    });

    it('is false before 20 captures are done', () => {
        expect(allFailedSoFar(19, 19)).toBe(false);
    });

    it('is false when any of the first 20 captures worked', () => {
        expect(allFailedSoFar(20, 19)).toBe(false);
    });

    it('is false after the 20th capture, so it only decides once', () => {
        expect(allFailedSoFar(21, 21)).toBe(false);
    });
});
