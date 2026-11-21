import { existsSync, readFileSync } from 'node:fs';

import { shareOf } from './shards';
import type { CaptureRecord, CaptureTarget } from './types';

// Capture id -> how long it took last time, in ms.
export type Timings = Record<string, number>;

// `shares[i]` is the capture ids share i takes. Every share reads the same plan, so the split never differs between them.
export type SharePlan = { total: number; shares: string[][] };

const usable = (ms: unknown): ms is number => typeof ms === 'number' && Number.isFinite(ms) && ms > 0;

// Slowest first, each into the share with the least planned time. A capture with no timing counts as the median.
// With no timings at all it deals round-robin, like shareOf.
export function planShares(targets: CaptureTarget[], timings: Timings, total: number): SharePlan {
    if (!Number.isInteger(total) || total < 1) throw new Error(`Expected at least 1 share, got ${total}`);
    const known = targets.map((target) => timings[target.id]).filter(usable);
    if (known.length === 0) {
        return { total, shares: Array.from({ length: total }, (_, index) => shareOf(targets, { index, total }).map((target) => target.id)) };
    }
    const sorted = [...known].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];
    const cost = (target: CaptureTarget) => {
        const ms = timings[target.id];
        return usable(ms) ? ms : median;
    };
    const order = [...targets].sort((a, b) => cost(b) - cost(a) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
    const shares = Array.from({ length: total }, () => [] as string[]);
    const load = Array.from({ length: total }, () => 0);
    for (const target of order) {
        let lightest = 0;
        for (let index = 1; index < total; index += 1) if (load[index] < load[lightest]) lightest = index;
        shares[lightest].push(target.id);
        load[lightest] += cost(target);
    }
    return { total, shares };
}

// A plan that skips or doubles a capture would hide a change, so the run stops.
export function checkPlan(plan: SharePlan, targets: CaptureTarget[]) {
    if (plan.shares.length !== plan.total) throw new Error(`Expected ${plan.total} shares, the plan has ${plan.shares.length}`);
    const known = new Set(targets.map((target) => target.id));
    const seen = new Set<string>();
    for (const id of plan.shares.flat()) {
        if (!known.has(id)) throw new Error(`Planned but not in the story list: ${id}`);
        if (seen.has(id)) throw new Error(`In two shares: ${id}`);
        seen.add(id);
    }
    const missing = targets.find((target) => !seen.has(target.id));
    if (missing) throw new Error(`Not in any share: ${missing.id}`);
}

// A share's head captures, in story-list order.
export function headShareTargets(plan: SharePlan, targets: CaptureTarget[], index: number): CaptureTarget[] {
    const ids = new Set(plan.shares[index]);
    return targets.filter((target) => ids.has(target.id));
}

// The base can have captures the head no longer has. They go to the first share, so every base capture is taken once.
export function baseShareTargets(plan: SharePlan, baseTargets: CaptureTarget[], index: number): CaptureTarget[] {
    const ids = shareIdsToCompare(
        plan,
        baseTargets.map((target) => target.id),
        index,
    );
    return baseTargets.filter((target) => ids.has(target.id));
}

// The ids a share compares: its planned ones, and in the first share every base id no share planned.
export function shareIdsToCompare(plan: SharePlan, baseIds: string[], index: number): Set<string> {
    const ids = new Set(plan.shares[index]);
    if (index === 0) {
        const planned = new Set(plan.shares.flat());
        for (const id of baseIds) if (!planned.has(id)) ids.add(id);
    }
    return ids;
}

export const timingsFrom = (records: CaptureRecord[]): Timings =>
    Object.fromEntries(records.filter((record) => usable(record.ms)).map((record) => [record.id, record.ms as number]));

// No file, or one that can't be read, means no timings: the plan falls back to round-robin.
export function readTimings(path: string): Timings {
    if (!existsSync(path)) return {};
    try {
        const parsed: unknown = JSON.parse(readFileSync(path, 'utf8'));
        return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? (parsed as Timings) : {};
    } catch {
        return {};
    }
}
