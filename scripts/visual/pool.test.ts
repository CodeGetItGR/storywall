// @vitest-environment node
import { describe, expect, it } from 'vitest';

import { runPool } from './pool';

describe('runPool', () => {
    it('keeps results in input order', async () => {
        const result = await runPool([30, 10, 20], 2, async (delay) => {
            await new Promise((done) => setTimeout(done, delay));
            return delay * 2;
        });
        expect(result).toEqual([60, 20, 40]);
    });

    it('never runs more than the limit at once', async () => {
        let running = 0;
        let peak = 0;
        await runPool([1, 2, 3, 4, 5, 6], 2, async () => {
            running += 1;
            peak = Math.max(peak, running);
            await new Promise((done) => setTimeout(done, 5));
            running -= 1;
        });
        expect(peak).toBe(2);
    });
});
