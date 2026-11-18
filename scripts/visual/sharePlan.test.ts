// @vitest-environment node
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { baseShareTargets, checkPlan, headShareTargets, planShares, readTimings, shareIdsToCompare, timingsFrom } from './sharePlan';
import type { CaptureRecord, CaptureTarget } from './types';

const target = (id: string): CaptureTarget => ({ id, storyId: id, title: 'T', name: id, locale: 'en', width: 'mobile' });
const targets = (...ids: string[]) => ids.map(target);

describe('planShares', () => {
    it('deals round-robin, like shareOf, when there are no timings', () => {
        expect(planShares(targets('a', 'b', 'c', 'd', 'e'), {}, 2).shares).toEqual([
            ['a', 'c', 'e'],
            ['b', 'd'],
        ]);
    });

    it('puts the slowest captures first, each in the share with the least time so far', () => {
        const plan = planShares(targets('a', 'b', 'c', 'd'), { a: 10, b: 7, c: 4, d: 3 }, 2);
        // a(10) -> 0; b(7) -> 1; c(4) -> 1 (7 < 10); d(3) -> 0 (10 < 11)
        expect(plan.shares).toEqual([
            ['a', 'd'],
            ['b', 'c'],
        ]);
    });

    it('counts a capture with no timing as the median', () => {
        const plan = planShares(targets('a', 'b', 'c', 'new'), { a: 9, b: 5, c: 1 }, 2);
        // Costs a 9, b 5, new 5 (the median), c 1, ties by id. a -> 0; b -> 1; new -> 1 (9 vs 5); c -> 0 (9 vs 10).
        expect(plan.shares).toEqual([
            ['a', 'c'],
            ['b', 'new'],
        ]);
    });

    it('ignores timings that are not positive numbers', () => {
        expect(planShares(targets('a', 'b'), { a: -1, b: Number.NaN }, 2).shares).toEqual([['a'], ['b']]);
    });

    it.each([0, -1, 1.5, Number.NaN])('needs at least one whole share, not %s', (total) => {
        expect(() => planShares(targets('a'), {}, total)).toThrow(`Expected at least 1 share, got ${total}`);
    });

    it('gives every capture to exactly one share', () => {
        const ids = Array.from({ length: 50 }, (_, index) => `s${index}`);
        const timings = Object.fromEntries(ids.map((id, index) => [id, (index * 37) % 11]));
        const plan = planShares(targets(...ids), timings, 6);
        expect(plan.shares.flat().sort()).toEqual([...ids].sort());
        expect(() => checkPlan(plan, targets(...ids))).not.toThrow();
    });
});

describe('checkPlan', () => {
    it('stops on a capture in no share', () => {
        expect(() => checkPlan({ total: 2, shares: [['a'], []] }, targets('a', 'b'))).toThrow('Not in any share: b');
    });

    it('stops on a capture in two shares', () => {
        expect(() => checkPlan({ total: 2, shares: [['a'], ['a']] }, targets('a'))).toThrow('In two shares: a');
    });

    it('stops on a capture the story list does not have', () => {
        expect(() => checkPlan({ total: 1, shares: [['a', 'x']] }, targets('a'))).toThrow('Planned but not in the story list: x');
    });

    it('stops when the share count does not match', () => {
        expect(() => checkPlan({ total: 2, shares: [['a']] }, targets('a'))).toThrow('Expected 2 shares, the plan has 1');
    });
});

describe('share targets', () => {
    const plan = { total: 2, shares: [['b', 'a'], ['c']] };

    it('keeps story-list order for a share', () => {
        expect(headShareTargets(plan, targets('a', 'b', 'c'), 0).map((t) => t.id)).toEqual(['a', 'b']);
    });

    it('gives base-only captures to the first share', () => {
        const base = targets('a', 'c', 'gone');
        expect(baseShareTargets(plan, base, 0).map((t) => t.id)).toEqual(['a', 'gone']);
        expect(baseShareTargets(plan, base, 1).map((t) => t.id)).toEqual(['c']);
    });

    it('compares base-only captures in the first share', () => {
        expect([...shareIdsToCompare(plan, ['a', 'c', 'gone'], 0)].sort()).toEqual(['a', 'b', 'gone']);
        expect([...shareIdsToCompare(plan, ['a', 'c', 'gone'], 1)]).toEqual(['c']);
    });
});

describe('timings', () => {
    let dir: string;
    afterEach(() => dir && rmSync(dir, { recursive: true, force: true }));

    it('keeps the time of every capture that has one', () => {
        const records: CaptureRecord[] = [
            { ...target('a'), status: 'ok', hash: 'h', error: null, ms: 1200 },
            { ...target('b'), status: 'failed', hash: null, error: 'x', ms: 30000 },
            { ...target('c'), status: 'ok', hash: 'h', error: null },
        ];
        expect(timingsFrom(records)).toEqual({ a: 1200, b: 30000 });
    });

    it('reads a timings file', () => {
        dir = mkdtempSync(join(tmpdir(), 'visual-timings-'));
        writeFileSync(join(dir, 'timings.json'), JSON.stringify({ a: 5 }));
        expect(readTimings(join(dir, 'timings.json'))).toEqual({ a: 5 });
    });

    it('treats a missing or broken timings file as no timings', () => {
        dir = mkdtempSync(join(tmpdir(), 'visual-timings-'));
        writeFileSync(join(dir, 'broken.json'), '{');
        expect(readTimings(join(dir, 'missing.json'))).toEqual({});
        expect(readTimings(join(dir, 'broken.json'))).toEqual({});
    });
});
