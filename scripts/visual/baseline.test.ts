// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';

import { baseState, pendingBaselineRun, waitForRun } from './baseline';

describe('pendingBaselineRun', () => {
    it('picks the newest run that has not finished', () => {
        const runs = [
            { id: 3, status: 'completed' },
            { id: 2, status: 'in_progress' },
            { id: 1, status: 'queued' },
        ];
        expect(pendingBaselineRun(runs)).toBe(2);
    });

    it.each(['queued', 'in_progress', 'waiting', 'pending', 'requested'])('counts %s as not finished', (status) => {
        expect(pendingBaselineRun([{ id: 7, status }])).toBe(7);
    });

    it('is null when every run has finished, or there are none', () => {
        expect(pendingBaselineRun([{ id: 1, status: 'completed' }])).toBeNull();
        expect(pendingBaselineRun([])).toBeNull();
    });
});

describe('baseState', () => {
    it('is saved when the cache has the base', () => {
        expect(baseState(true, 5)).toBe('saved');
    });

    it('is pending when a baseline run is still going', () => {
        expect(baseState(false, 5)).toBe('pending');
    });

    it('is missing otherwise', () => {
        expect(baseState(false, null)).toBe('missing');
    });
});

describe('waitForRun', () => {
    const clock = () => {
        let now = 0;
        return { now: () => now, sleep: vi.fn(async (ms: number) => void (now += ms)) };
    };

    it('returns completed once the run finishes', async () => {
        const { now, sleep } = clock();
        const statuses = ['in_progress', 'in_progress', 'completed'];
        const getStatus = vi.fn(async () => statuses.shift() ?? 'completed');
        await expect(waitForRun({ getStatus, sleep, now, limitMs: 900_000, intervalMs: 30_000 })).resolves.toBe('completed');
        expect(getStatus).toHaveBeenCalledTimes(3);
    });

    it('gives up after the limit', async () => {
        const { now, sleep } = clock();
        const getStatus = vi.fn(async () => 'in_progress');
        await expect(waitForRun({ getStatus, sleep, now, limitMs: 90_000, intervalMs: 30_000 })).resolves.toBe('timeout');
        expect(now()).toBeLessThanOrEqual(90_000);
    });

    it('keeps waiting through an API error, and gives up at the limit', async () => {
        const { now, sleep } = clock();
        const getStatus = vi.fn(async () => {
            throw new Error('502');
        });
        await expect(waitForRun({ getStatus, sleep, now, limitMs: 60_000, intervalMs: 30_000 })).resolves.toBe('timeout');
        expect(getStatus).toHaveBeenCalled();
    });
});
