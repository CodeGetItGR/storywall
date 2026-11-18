# KAN-237 Visual Pipeline Trims Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cut the visual check from 12–14 min to about 9–11 min, and stop the 17–21 min runs that recapture a base that `visual-baseline` is still capturing.

**Architecture:**
- The build job packs the visual scripts into one bundled file plus `playwright-core` and `sharp` (the "runtime pack"). Every later job runs it with plain `node`, with no checkout and no `npm ci` where neither is needed.
- Each capture share captures its planned stories, gets the base (saved, waited for, or captured itself), compares its own captures and uploads a share report.
- A small `report` job joins the share reports into the one `manifest.json` that `publish.mjs` reads today.
- Shares are planned from the last run's capture times.

**Tech Stack:** TypeScript scripts in `scripts/visual/` (run locally with `jiti`), vitest, esbuild (bundling), Playwright 1.55 in `mcr.microsoft.com/playwright:v1.55.0-noble`, GitHub Actions (`actions/cache`, `actions/upload-artifact`, GitHub REST API).

**Spec:** `docs/superpowers/specs/2026-11-17-visual-pipeline-trims-design.md`

**Rules for every task:**
- The commit message starts with `KAN-237: ` and ends with the trailer `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Stage files by name. Never `git add -A`.
- `npm ci` changes `public/mockServiceWorker.js`. Revert it with `git checkout -- public/mockServiceWorker.js` and never commit it.
- Run vitest files one at a time with `npx vitest run <file>`. The full suite has known load timeouts in the save-my-date editor tests that pass on their own.

---

## File structure

| File | Change | Responsibility |
|---|---|---|
| `scripts/visual/types.ts` | modify | `CaptureRecord.ms` |
| `scripts/visual/capture.ts` | modify | time each capture |
| `scripts/visual/sharePlan.ts` | create | plan shares from timings, pick a share's head and base targets, timings file |
| `scripts/visual/sharePlan.test.ts` | create | tests for the above |
| `scripts/visual/report.ts` | modify | split `buildReport` into `compareCaptures` + `finishReport` |
| `scripts/visual/shareReport.ts` | create | write one share's report, join all share reports |
| `scripts/visual/shareReport.test.ts` | create | joined report equals a single-job report; join errors |
| `scripts/visual/baseline.ts` | create | find an in-flight `visual-baseline` run, wait for it |
| `scripts/visual/baseline.test.ts` | create | tests for the above |
| `scripts/visual/ci.ts` | modify | new CI steps |
| `scripts/visual/pack.mjs` | create | build the runtime pack |
| `scripts/visual/pack.test.ts` | create | package list the pack copies |
| `package.json`, `package-lock.json` | modify | `esbuild` as a direct dev dependency |
| `.github/workflows/visual-check.yml` | modify | new job layout |
| `.github/workflows/visual-baseline.yml` | modify | runtime pack, share plan, timings |
| `scripts/visual/workflows.test.ts` | modify | tests for both workflows |
| `.gitignore` | modify | ignore `visual-runtime/` |

---

### Task 1: Time each capture

**Files:**
- Modify: `scripts/visual/types.ts`
- Modify: `scripts/visual/capture.ts` (`captureTarget`)

A capture needs a real browser, so this has no unit test. Task 6's plan tests and the live runs in Task 12 cover it.

- [ ] **Step 1: Add `ms` to the record type**

In `scripts/visual/types.ts`, replace the `CaptureRecord` comment and type:

```ts
// `machine` is the CPU that took the capture, for the run log. Records saved before it existed have none.
// `ms` is how long the capture took, for planning the next run's shares. Records saved before it existed have none.
export type CaptureRecord = CaptureTarget & { status: 'ok' | 'failed'; hash: string | null; error: string | null; machine?: string; ms?: number };
```

- [ ] **Step 2: Measure it in `captureTarget`**

In `scripts/visual/capture.ts`, replace `captureTarget` with:

```ts
// A thrown error is the story's fault, so it isn't retried. Anything else can be a busy runner or a network blip.
// `ms` covers both attempts, because that is the time the capture costs a share.
export async function captureTarget(browser: Browser, origin: string, target: CaptureTarget, outDir: string): Promise<CaptureRecord> {
    const started = performance.now();
    let result = await shoot(browser, origin, target);
    if ('error' in result && result.retry) result = await shoot(browser, origin, target);
    const ms = Math.round(performance.now() - started);
    if ('error' in result) return { ...target, status: 'failed', hash: null, error: result.error, machine: MACHINE, ms };
    writeFileSync(join(outDir, `${target.id}.png`), result.png);
    return { ...target, status: 'ok', hash: hashRaw(await decodePng(result.png)), error: null, machine: MACHINE, ms };
}
```

- [ ] **Step 3: Check types and existing tests**

Run: `npx tsc --noEmit` (expected: no output, exit 0).
Run: `npx vitest run scripts/visual/capture.test.ts scripts/visual/report.test.ts scripts/visual/shards.test.ts` (expected: all pass).

- [ ] **Step 4: Commit**

```bash
git add scripts/visual/types.ts scripts/visual/capture.ts
git commit -m "KAN-237: Record how long each capture takes"
```

---

### Task 2: Share plan

**Files:**
- Create: `scripts/visual/sharePlan.ts`
- Test: `scripts/visual/sharePlan.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `scripts/visual/sharePlan.test.ts`:

```ts
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
```

- [ ] **Step 2: Run the tests to see them fail**

Run: `npx vitest run scripts/visual/sharePlan.test.ts`
Expected: FAIL, `Cannot find module './sharePlan'` (or failed to resolve import).

- [ ] **Step 3: Write `sharePlan.ts`**

Create `scripts/visual/sharePlan.ts`:

```ts
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
```

- [ ] **Step 4: Run the tests to see them pass**

Run: `npx vitest run scripts/visual/sharePlan.test.ts`
Expected: PASS, all tests.

- [ ] **Step 5: Lint and commit**

Run: `npx eslint scripts/visual/sharePlan.ts scripts/visual/sharePlan.test.ts` (expected: no output).

```bash
git add scripts/visual/sharePlan.ts scripts/visual/sharePlan.test.ts
git commit -m "KAN-237: Plan capture shares from the last run's timings"
```

---

### Task 3: Split the report into compare and finish

**Files:**
- Modify: `scripts/visual/report.ts`
- Test: `scripts/visual/report.test.ts` (existing tests must keep passing unchanged)

`buildReport` keeps its signature and behaviour. It becomes `compareCaptures` (per share) followed by `finishReport` (once, over everything).

- [ ] **Step 1: Run the existing report tests as the baseline**

Run: `npx vitest run scripts/visual/report.test.ts`
Expected: PASS. Note the number of tests.

- [ ] **Step 2: Refactor `report.ts`**

In `scripts/visual/report.ts`:

1. Add `ReportEntry` to the types import (it is already imported) and add this after the `BaseRecheck` type:

```ts
// What one compare found, before changes are grouped. A share writes this; the report job joins every share's.
export type Comparison = { entries: ReportEntry[]; signatures: SignedCapture[] };

type CompareInput = Omit<BuildReportInput, 'baseSha' | 'headSha' | 'missingStories'>;

type FinishInput = Comparison & { reportDir: string; baseSha: string; headSha: string; totalCaptures: number; missingStories: string[] };
```

2. Rename `export async function buildReport(input: BuildReportInput): Promise<Manifest> {` to `export async function compareCaptures(input: CompareInput): Promise<Comparison> {`, and change its first line to:

```ts
    const { baseDir, headDir, reportDir, baseRecords, headRecords, retake, baseRecheck } = input;
```

3. Replace everything in that function from `const found = (await runPool(ids, CONCURRENCY, entryFor))...` to the end of the function with:

```ts
    const entries = (await runPool(ids, CONCURRENCY, entryFor)).filter((entry) => entry !== null);
    return { entries, signatures };
}

const byId = (a: { id: string }, b: { id: string }) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

// Groups changes that look the same, counts, fingerprints and writes manifest.json. The same for one job or many shares.
export function finishReport({ reportDir, entries, signatures, baseSha, headSha, totalCaptures, missingStories }: FinishInput): Manifest {
    const { groups, keys } = groupChanges(signatures);
    const keyed = [...entries].sort(byId).map((entry) => ({ ...entry, changeKey: keys.get(entry.id) ?? null }));

    const counts: Record<CaptureState, number> = { changed: 0, new: 0, removed: 0, failed: 0 };
    for (const entry of keyed) counts[entry.state] += 1;

    const manifest: Manifest = {
        headSha,
        baseSha,
        totalCaptures,
        counts,
        fingerprint: fingerprint(keyed),
        entries: keyed,
        groups,
        missingStories,
    };
    mkdirSync(reportDir, { recursive: true });
    writeFileSync(join(reportDir, 'manifest.json'), JSON.stringify(manifest, null, 2));
    return manifest;
}

export async function buildReport(input: BuildReportInput): Promise<Manifest> {
    const { baseSha, headSha, missingStories, ...compareInput } = input;
    const comparison = await compareCaptures(compareInput);
    return finishReport({ ...comparison, reportDir: input.reportDir, baseSha, headSha, totalCaptures: input.headRecords.length, missingStories });
}
```

The old code kept entries in `ids` order, which is sorted the same way as `byId`, so the order of `entries` in the manifest is unchanged.

- [ ] **Step 3: Run the report tests again**

Run: `npx vitest run scripts/visual/report.test.ts`
Expected: PASS, the same number of tests as in Step 1.

Run: `npx tsc --noEmit` (expected: exit 0) and `npx eslint scripts/visual/report.ts` (expected: no output).

- [ ] **Step 4: Commit**

```bash
git add scripts/visual/report.ts
git commit -m "KAN-237: Split the report into a compare and a finish step"
```

---

### Task 4: Share reports and the join

**Files:**
- Create: `scripts/visual/shareReport.ts`
- Test: `scripts/visual/shareReport.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `scripts/visual/shareReport.test.ts`. It uses the same solid-gray fixtures as `report.test.ts`: a 10 → 200 change on two captures forms one colour group, and a retake returns the same head shot, like a real change.

```ts
// @vitest-environment node
import { mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import sharp from 'sharp';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { decodePng, hashRaw } from './images';
import { buildReport, compareCaptures } from './report';
import { joinShareReports, writeShareReport } from './shareReport';
import type { CaptureRecord, CaptureTarget } from './types';

const solid = (gray: number) =>
    sharp({ create: { width: 20, height: 20, channels: 4, background: { r: gray, g: gray, b: gray, alpha: 1 } } })
        .png()
        .toBuffer();

const target = (id: string): CaptureTarget => ({ id, storyId: id, title: 'UI/Button', name: id, locale: 'en', width: 'mobile' });

describe('joinShareReports', () => {
    let root: string;
    let baseDir: string;
    let headDir: string;
    let singleDir: string;
    let sharesDir: string;
    let baseRecords: CaptureRecord[];
    let headRecords: CaptureRecord[];

    async function record(dir: string, id: string, gray: number): Promise<CaptureRecord> {
        const png = await solid(gray);
        writeFileSync(join(dir, `${id}.png`), png);
        return { ...target(id), status: 'ok', hash: hashRaw(await decodePng(png)), error: null };
    }

    // Every retake gives the same head shot, like a real change.
    const retake = async (t: CaptureTarget) => headRecords.find((item) => item.id === t.id) as CaptureRecord;
    const targets = () => headRecords.map((item) => target(item.id));
    const shas = { baseSha: 'b', headSha: 'h', missingStories: [] };

    // a and b get the same change and land in different shares; fresh is new, gone is removed, same is unchanged.
    beforeEach(async () => {
        root = mkdtempSync(join(tmpdir(), 'visual-share-report-'));
        [baseDir, headDir, singleDir, sharesDir] = ['base', 'head', 'single', 'shares'].map((name) => join(root, name));
        for (const dir of [baseDir, headDir, singleDir, sharesDir]) mkdirSync(dir);
        baseRecords = [await record(baseDir, 'a', 10), await record(baseDir, 'b', 10), await record(baseDir, 'gone', 90), await record(baseDir, 'same', 50)];
        headRecords = [await record(headDir, 'a', 200), await record(headDir, 'b', 200), await record(headDir, 'fresh', 120), await record(headDir, 'same', 50)];
    });

    afterEach(() => rmSync(root, { recursive: true, force: true }));

    async function writeShare(index: number, ids: string[]) {
        const shareHead = headRecords.filter((item) => ids.includes(item.id));
        const comparison = await compareCaptures({
            baseDir,
            headDir,
            reportDir: sharesDir,
            baseRecords: baseRecords.filter((item) => ids.includes(item.id)),
            headRecords: shareHead,
            retake,
        });
        writeShareReport(sharesDir, index, { ...comparison, headRecords: shareHead });
    }

    it('joins share reports into the same manifest a single job writes', async () => {
        const single = await buildReport({ baseDir, headDir, reportDir: singleDir, baseRecords, headRecords, ...shas, retake });
        await writeShare(0, ['a', 'gone', 'same']);
        await writeShare(1, ['b', 'fresh']);

        const { manifest, headRecords: joinedHead } = joinShareReports(sharesDir, targets(), shas);

        expect(manifest).toEqual(single);
        expect(manifest.groups).toHaveLength(1);
        const keys = Object.fromEntries(manifest.entries.map((entry) => [entry.id, entry.changeKey]));
        expect(keys).toEqual({ a: 'color-1', b: 'color-1', fresh: null, gone: null });
        expect(joinedHead.map((item) => item.id)).toEqual(['a', 'b', 'fresh', 'same']);
        expect(readdirSync(sharesDir).filter((name) => name.startsWith('share-'))).toEqual([]);
    });

    it('stops when a share report is missing', async () => {
        await writeShare(0, ['a', 'gone', 'same']);
        expect(() => joinShareReports(sharesDir, targets(), shas)).toThrow('Missing 2 of 4 captures');
    });

    it('stops when two shares report the same capture', async () => {
        await writeShare(0, ['a', 'b', 'fresh', 'gone', 'same']);
        await writeShare(1, ['a']);
        expect(() => joinShareReports(sharesDir, targets(), shas)).toThrow('Captured twice: a');
    });

    it('stops on a capture the story list does not have', async () => {
        await writeShare(0, ['a', 'b', 'fresh', 'gone', 'same']);
        expect(() => joinShareReports(sharesDir, targets().slice(1), shas)).toThrow('Captured but not in the story list: a');
    });

    it('stops when there are no share reports', () => {
        expect(() => joinShareReports(sharesDir, targets(), shas)).toThrow('No share reports in');
    });
});
```

- [ ] **Step 2: Run the tests to see them fail**

Run: `npx vitest run scripts/visual/shareReport.test.ts`
Expected: FAIL, cannot resolve `./shareReport`.

- [ ] **Step 3: Write `shareReport.ts`**

Create `scripts/visual/shareReport.ts`:

```ts
import { existsSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { type Comparison, finishReport } from './report';
import { joinShares } from './shards';
import type { CaptureRecord, CaptureTarget, Manifest } from './types';

// One share's compare: its entries and change signatures, and its head records so the join can check none is lost.
export type ShareReport = Comparison & { headRecords: CaptureRecord[] };

const SHARE_FILE = /^share-\d+\.json$/;

// Written next to the share's images, so downloading every share's report folder into one gives the whole report.
export function writeShareReport(dir: string, index: number, report: ShareReport) {
    writeFileSync(join(dir, `share-${index}.json`), JSON.stringify(report));
}

// Joins every share report in `dir` into manifest.json, then removes the share files.
// The head records must cover the story list exactly once, as in joinShares. A share compares only its own
// head records, so that also means no entry is reported twice. The joined head records feed the timings file.
export function joinShareReports(
    dir: string,
    targets: CaptureTarget[],
    { baseSha, headSha, missingStories }: { baseSha: string; headSha: string; missingStories: string[] },
): { manifest: Manifest; headRecords: CaptureRecord[] } {
    const files = existsSync(dir) ? readdirSync(dir).filter((name) => SHARE_FILE.test(name)) : [];
    if (files.length === 0) throw new Error(`No share reports in ${dir}`);
    const reports = files.map((name) => JSON.parse(readFileSync(join(dir, name), 'utf8')) as ShareReport);
    const headRecords = joinShares(
        targets,
        reports.flatMap((report) => report.headRecords),
    );
    const manifest = finishReport({
        reportDir: dir,
        entries: reports.flatMap((report) => report.entries),
        signatures: reports.flatMap((report) => report.signatures),
        baseSha,
        headSha,
        totalCaptures: headRecords.length,
        missingStories,
    });
    for (const name of files) rmSync(join(dir, name));
    return { manifest, headRecords };
}
```

- [ ] **Step 4: Run the tests to see them pass**

Run: `npx vitest run scripts/visual/shareReport.test.ts`
Expected: PASS, 5 tests.

- [ ] **Step 5: Lint and commit**

Run: `npx eslint scripts/visual/shareReport.ts scripts/visual/shareReport.test.ts` (expected: no output).

```bash
git add scripts/visual/shareReport.ts scripts/visual/shareReport.test.ts
git commit -m "KAN-237: Write a report per share and join them"
```

---

### Task 5: Find and wait for an in-flight baseline run

**Files:**
- Create: `scripts/visual/baseline.ts`
- Test: `scripts/visual/baseline.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `scripts/visual/baseline.test.ts`:

```ts
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
```

- [ ] **Step 2: Run the tests to see them fail**

Run: `npx vitest run scripts/visual/baseline.test.ts`
Expected: FAIL, cannot resolve `./baseline`.

- [ ] **Step 3: Write `baseline.ts`**

Create `scripts/visual/baseline.ts`:

```ts
// Finds a visual-baseline run that is still capturing a PR's base, and waits for it,
// so the PR doesn't capture the same base again.

export type BaseState = 'saved' | 'pending' | 'missing';

type Run = { id: number; status: string };

const NOT_FINISHED = new Set(['queued', 'in_progress', 'waiting', 'pending', 'requested']);

// The API lists the newest run first.
export const pendingBaselineRun = (runs: Run[]): number | null => runs.find((run) => NOT_FINISHED.has(run.status))?.id ?? null;

export const baseState = (cacheHit: boolean, pendingRun: number | null): BaseState => (cacheHit ? 'saved' : pendingRun !== null ? 'pending' : 'missing');

type GitHub = { repo: string; token: string };

async function api<T>({ repo, token }: GitHub, path: string): Promise<T> {
    const response = await fetch(`https://api.github.com/repos/${repo}${path}`, {
        headers: { authorization: `Bearer ${token}`, accept: 'application/vnd.github+json', 'x-github-api-version': '2022-11-28' },
    });
    if (!response.ok) throw new Error(`GitHub API ${response.status} for ${path}`);
    return (await response.json()) as T;
}

export async function findPendingBaselineRun(github: GitHub, sha: string): Promise<number | null> {
    const { workflow_runs: runs } = await api<{ workflow_runs: Run[] }>(github, `/actions/workflows/visual-baseline.yml/runs?head_sha=${sha}&per_page=20`);
    return pendingBaselineRun(runs);
}

export const runStatus = async (github: GitHub, runId: number) => (await api<Run>(github, `/actions/runs/${runId}`)).status;

type WaitInput = {
    getStatus: () => Promise<string>;
    sleep: (ms: number) => Promise<void>;
    now: () => number;
    limitMs: number;
    intervalMs: number;
};

// An API error counts as "still going": giving up early would only make the share capture the base itself.
export async function waitForRun({ getStatus, sleep, now, limitMs, intervalMs }: WaitInput): Promise<'completed' | 'timeout'> {
    const deadline = now() + limitMs;
    for (;;) {
        try {
            if ((await getStatus()) === 'completed') return 'completed';
        } catch (error) {
            process.stdout.write(`Could not read the baseline run: ${error instanceof Error ? error.message : String(error)}\n`);
        }
        const left = deadline - now();
        if (left <= 0) return 'timeout';
        await sleep(Math.min(intervalMs, left));
    }
}
```

- [ ] **Step 4: Run the tests to see them pass**

Run: `npx vitest run scripts/visual/baseline.test.ts`
Expected: PASS.

- [ ] **Step 5: Lint and commit**

Run: `npx eslint scripts/visual/baseline.ts scripts/visual/baseline.test.ts` (expected: no output).

```bash
git add scripts/visual/baseline.ts scripts/visual/baseline.test.ts
git commit -m "KAN-237: Find and wait for an in-flight baseline run"
```

---

### Task 6: New CI steps

**Files:**
- Modify: `scripts/visual/ci.ts`

The steps are thin wrappers around the tested modules, so this task adds no unit tests. The live runs in Task 12 exercise every step.

- [ ] **Step 1: Replace `ci.ts`**

Replace the whole of `scripts/visual/ci.ts` with:

```ts
// The visual check's CI steps. The workflows run them in separate jobs, so the captures can be
// split across runners. run.ts runs the same steps in one go for local use.
// In CI they run from the runtime pack (node visual-runtime/ci.mjs <step>), built by scripts/visual/pack.mjs.
//
//   build                                                                   build HEAD's Storybook into storybook-static
//   build-base --base <sha>                                                 build that commit's Storybook into visual-output/base-storybook
//   plan --storybook <dir> --timings <file> --out <file>                    plan the shares from the last run's timings
//   capture --share 0/6 --plan <file> --storybook <dir> --out <dir>         capture one share of a build's stories
//   capture-base --share 0/6 --plan <file> --storybook <dir> --out <dir>    capture one share of the base build's stories
//   compare-share --share 0/6 --plan <file> --base <sha> --base-records <file> --base-storybook <dir>
//                                                                           compare one share with the base into visual-output/report
//   join-report --plan <file> --storybook <dir> --base <sha> --timings <file>  join the share reports into manifest.json
//   join --storybook <dir> --dir <dir> --sha <sha> [--timings <file>]       join the shares' records into captures.json
//   base-state --sha <sha> --cache-hit <true|false>                         write state=saved|pending|missing and run-id to $GITHUB_OUTPUT
//   wait-baseline --run <id> --minutes <n>                                  wait for that run to finish
//   selfcheck                                                               load playwright-core and sharp, to test the runtime pack

import { appendFileSync, copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { parseArgs } from 'node:util';

import { baseState, findPendingBaselineRun, runStatus, waitForRun } from './baseline';
import { captureAll, captureTarget } from './capture';
import { findMissingStories } from './missingStories';
import { compareCaptures } from './report';
import { joinShareFiles, parseShare, writeShareRecords } from './shards';
import { baseShareTargets, checkPlan, headShareTargets, planShares, readTimings, type SharePlan, shareIdsToCompare, timingsFrom } from './sharePlan';
import { joinShareReports, writeShareReport } from './shareReport';
import {
    BASE_RECHECK_DIR,
    BASE_STORYBOOK_DIR,
    buildCommitStorybook,
    buildStorybook,
    git,
    HEAD_DIR,
    print,
    REPORT_DIR,
    saveRecords,
    STORYBOOK_DIR,
    targetsFrom,
    withBaseRecheck,
    withStorybook,
} from './steps';
import type { CaptureRecord } from './types';

const { values: args, positionals } = parseArgs({
    allowPositionals: true,
    options: {
        base: { type: 'string' },
        share: { type: 'string' },
        plan: { type: 'string' },
        storybook: { type: 'string' },
        out: { type: 'string' },
        dir: { type: 'string' },
        sha: { type: 'string' },
        timings: { type: 'string' },
        'base-records': { type: 'string' },
        'base-storybook': { type: 'string' },
        'cache-hit': { type: 'string' },
        run: { type: 'string' },
        minutes: { type: 'string' },
    },
});

function required(name: keyof typeof args): string {
    const value = args[name];
    if (typeof value !== 'string' || value === '') throw new Error(`Pass --${name}`);
    return value;
}

const readJson = <T>(path: string) => JSON.parse(readFileSync(path, 'utf8')) as T;

function writeJson(path: string, value: unknown) {
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, JSON.stringify(value));
}

function github() {
    const repo = process.env.GITHUB_REPOSITORY;
    const token = process.env.GITHUB_TOKEN;
    if (!repo || !token) throw new Error('Set GITHUB_REPOSITORY and GITHUB_TOKEN');
    return { repo, token };
}

// A commit from before Storybook existed gets an empty story list, so every head story counts as new.
function buildBase() {
    if (buildCommitStorybook(required('base'), BASE_STORYBOOK_DIR)) return;
    mkdirSync(BASE_STORYBOOK_DIR, { recursive: true });
    writeFileSync(join(BASE_STORYBOOK_DIR, 'index.json'), JSON.stringify({ v: 5, entries: {} }));
}

function plan() {
    const targets = targetsFrom(required('storybook'));
    const timings = readTimings(required('timings'));
    const sharePlan = planShares(targets, timings, 6);
    checkPlan(sharePlan, targets);
    writeJson(required('out'), sharePlan);
    print(`Planned 6 shares from ${Object.keys(timings).length} timings: ${sharePlan.shares.map((ids) => ids.length).join(', ')} captures`);
}

function sharePlanFor(total: number): SharePlan {
    const sharePlan = readJson<SharePlan>(required('plan'));
    if (sharePlan.total !== total) throw new Error(`The plan has ${sharePlan.total} shares, the job ${total}`);
    return sharePlan;
}

async function captureShare(pick: 'head' | 'base') {
    const share = parseShare(required('share'));
    const storybookDir = required('storybook');
    const outDir = required('out');
    rmSync(outDir, { recursive: true, force: true });
    const sharePlan = sharePlanFor(share.total);
    const all = targetsFrom(storybookDir);
    const targets = pick === 'head' ? headShareTargets(sharePlan, all, share.index) : baseShareTargets(sharePlan, all, share.index);
    print(`Share ${share.index + 1} of ${share.total}: ${targets.length} ${pick} captures`);
    const records = await withStorybook(storybookDir, (browser, origin) => captureAll(browser, origin, targets, outDir));
    writeShareRecords(outDir, share.index, records);
}

// Compares this share's head captures with the base, on this runner: retakes from the head build,
// and the base recheck from the base build. Writes the share's images and share-<index>.json into the report folder.
async function compareShare() {
    const share = parseShare(required('share'));
    const sharePlan = sharePlanFor(share.total);
    const baseSha = required('base');
    const headRecords = readJson<CaptureRecord[]>(join(HEAD_DIR, `records-${share.index}.json`));
    const allBase = readJson<CaptureRecord[]>(required('base-records'));
    const ids = shareIdsToCompare(
        sharePlan,
        allBase.map((record) => record.id),
        share.index,
    );
    const baseRecords = allBase.filter((record) => ids.has(record.id));
    const baseDir = dirname(required('base-records'));
    rmSync(REPORT_DIR, { recursive: true, force: true });
    mkdirSync(join(REPORT_DIR, 'img'), { recursive: true });
    await withStorybook(STORYBOOK_DIR, async (browser, origin) => {
        const comparison = await withBaseRecheck(browser, required('base-storybook'), baseSha, BASE_RECHECK_DIR, (baseRecheck) =>
            compareCaptures({
                baseDir,
                headDir: HEAD_DIR,
                reportDir: REPORT_DIR,
                baseRecords,
                headRecords,
                retake: (target) => captureTarget(browser, origin, target, HEAD_DIR),
                baseRecheck,
            }),
        );
        writeShareReport(REPORT_DIR, share.index, { ...comparison, headRecords });
        print(`Share ${share.index + 1}: ${comparison.entries.length} entries`);
    });
}

function joinReport() {
    const baseSha = required('base');
    const added = git('diff', '--diff-filter=A', '--name-only', baseSha, 'HEAD').split('\n').filter(Boolean);
    const { total } = readJson<SharePlan>(required('plan'));
    const { manifest, headRecords } = joinShareReports(REPORT_DIR, targetsFrom(required('storybook')), {
        total,
        baseSha,
        headSha: git('rev-parse', 'HEAD'),
        missingStories: findMissingStories(added, existsSync),
    });
    copyFileSync(join('scripts', 'visual', 'report', 'dist', 'index.html'), join(REPORT_DIR, 'index.html'));
    const { changed, removed, failed } = manifest.counts;
    print(`${changed} changed, ${manifest.counts.new} new, ${removed} removed, ${failed} failed, of ${manifest.totalCaptures} captures.`);
    for (const entry of manifest.entries.filter((item) => item.state === 'failed')) print(`FAILED ${entry.id}: ${entry.error}`);
    writeJson(required('timings'), timingsFrom(headRecords));
}

function joinRecords() {
    const dir = required('dir');
    const joined = joinShareFiles(dir, targetsFrom(required('storybook')));
    saveRecords(dir, joined, required('sha'));
    if (args.timings) writeJson(args.timings, timingsFrom(joined));
    print(`Joined ${joined.length} captures`);
}

// A failed lookup only means the shares capture the base themselves, so it never fails the build.
async function pendingRunOrNull(sha: string): Promise<number | null> {
    try {
        return await findPendingBaselineRun(github(), sha);
    } catch (error) {
        print(`Could not look for a baseline run: ${error instanceof Error ? error.message : String(error)}`);
        return null;
    }
}

// saved: the cache has the base. pending: a visual-baseline run for it is still going. missing: neither.
async function baseStateStep() {
    const cacheHit = required('cache-hit') === 'true';
    const runId = cacheHit ? null : await pendingRunOrNull(required('sha'));
    const state = baseState(cacheHit, runId);
    print(state === 'pending' ? `Baseline run ${runId} is still going` : `The base is ${state}`);
    if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `state=${state}\nrun-id=${runId ?? ''}\n`);
}

async function waitBaseline() {
    const runId = Number(required('run'));
    const minutes = Number(required('minutes'));
    print(`Waiting up to ${minutes} min for baseline run ${runId}`);
    const result = await waitForRun({
        getStatus: () => runStatus(github(), runId),
        sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
        now: () => Date.now(),
        limitMs: minutes * 60_000,
        intervalMs: 30_000,
    });
    print(result === 'completed' ? 'The baseline run finished' : 'Stopped waiting: the share captures the base itself');
}

async function selfcheck() {
    const [{ chromium }, { default: sharp }] = await Promise.all([import('playwright-core'), import('sharp')]);
    print(`playwright-core ${typeof chromium.launch === 'function' ? 'ok' : 'broken'}, sharp ${sharp.versions.sharp}`);
}

const steps: Record<string, () => unknown> = {
    build: () => buildStorybook('.', STORYBOOK_DIR),
    'build-base': buildBase,
    plan,
    capture: () => captureShare('head'),
    'capture-base': () => captureShare('base'),
    'compare-share': compareShare,
    'join-report': joinReport,
    join: joinRecords,
    'base-state': baseStateStep,
    'wait-baseline': waitBaseline,
    selfcheck,
};

async function main() {
    const step = positionals.length === 1 ? steps[positionals[0]] : undefined;
    if (!step) throw new Error(`Pass one step: ${Object.keys(steps).join(', ')}`);
    await step();
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
```

- [ ] **Step 2: Check `steps.ts` exports**

`ci.ts` imports `BASE_RECHECK_DIR` and `withBaseRecheck` from `./steps`. Both are already exported. `compare` (the old step) and `SAVED_BASE_STORYBOOK_DIR` are no longer imported by `ci.ts`, but `writeReport` in `steps.ts` still uses them for local runs, so leave `steps.ts` as it is.

Run: `npx tsc --noEmit` (expected: exit 0).
Run: `npx eslint scripts/visual` (expected: no output; fix import order if the linter asks).

- [ ] **Step 3: Smoke-test the steps that need no browser**

```bash
npx jiti scripts/visual/ci.ts selfcheck
```

Expected: `playwright-core ok, sharp 0.35.5`.

```bash
npx jiti scripts/visual/ci.ts plan --storybook storybook-static --timings nope.json --out visual-output/plan-smoke.json
```

This needs a built `storybook-static`. Build one with `npm run build-storybook -- --quiet -o storybook-static` if it is missing. Expected: `Planned 6 shares from 0 timings: ...` with six counts that differ by at most 1. Delete `visual-output/plan-smoke.json` afterwards.

- [ ] **Step 4: Commit**

```bash
git add scripts/visual/ci.ts scripts/visual/shareReport.ts scripts/visual/shareReport.test.ts
git commit -m "KAN-237: CI steps for share plans, per-share compare and the report join"
```

---

### Task 7: Runtime pack

**Files:**
- Modify: `package.json`, `package-lock.json`
- Create: `scripts/visual/pack.mjs`
- Test: `scripts/visual/pack.test.ts`
- Modify: `.gitignore`

- [ ] **Step 1: Make esbuild a direct dev dependency**

It is already installed (0.28.2, through Vite). Pin that version so the pack doesn't depend on another package's choice:

```bash
npm install --save-dev --save-exact esbuild@0.28.2
git checkout -- public/mockServiceWorker.js
git diff --stat package.json package-lock.json
```

Expected: `package.json` gains `"esbuild": "0.28.2"` under `devDependencies`, and the lockfile changes only in its root `devDependencies` entry.

- [ ] **Step 2: Write the failing test**

Create `scripts/visual/pack.test.ts`:

```ts
// @vitest-environment node
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { packageClosure } from './pack.mjs';

describe('packageClosure', () => {
    let root: string;
    afterEach(() => rmSync(root, { recursive: true, force: true }));

    const pkg = (name: string, body: object) => {
        mkdirSync(join(root, 'node_modules', name), { recursive: true });
        writeFileSync(join(root, 'node_modules', name, 'package.json'), JSON.stringify({ name, ...body }));
    };

    it('follows dependencies and the optional dependencies that are installed', () => {
        root = mkdtempSync(join(tmpdir(), 'visual-pack-'));
        pkg('sharp', { dependencies: { 'detect-libc': '^2', semver: '^7' }, optionalDependencies: { '@img/sharp-linux-x64': '1', '@img/sharp-win32-x64': '1' } });
        pkg('detect-libc', {});
        pkg('semver', {});
        pkg('@img/sharp-linux-x64', { optionalDependencies: { '@img/sharp-libvips-linux-x64': '1' } });
        pkg('@img/sharp-libvips-linux-x64', {});
        pkg('playwright-core', {});
        expect(packageClosure(root, ['playwright-core', 'sharp'])).toEqual([
            '@img/sharp-libvips-linux-x64',
            '@img/sharp-linux-x64',
            'detect-libc',
            'playwright-core',
            'semver',
            'sharp',
        ]);
    });

    it('stops when a required dependency is not installed', () => {
        root = mkdtempSync(join(tmpdir(), 'visual-pack-'));
        pkg('sharp', { dependencies: { 'detect-libc': '^2' } });
        expect(() => packageClosure(root, ['sharp'])).toThrow('Not installed: detect-libc (needed by sharp)');
    });
});
```

Run: `npx vitest run scripts/visual/pack.test.ts`
Expected: FAIL, cannot resolve `./pack.mjs`.

- [ ] **Step 3: Write `pack.mjs`**

Create `scripts/visual/pack.mjs`:

```js
// Builds the runtime pack: the visual CI steps bundled into visual-runtime/ci.mjs, with only the packages they load
// at run time copied next to it. Jobs after the build run `node visual-runtime/ci.mjs <step>` with no npm ci.
//
//   node scripts/visual/pack.mjs     (after npm ci, from the repository root)

import { cpSync, existsSync, readFileSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const PACK_DIR = 'visual-runtime';
// Loaded at run time and never bundled: playwright-core finds its own files on disk, and sharp loads a native binary.
export const EXTERNAL = ['playwright-core', 'sharp'];

// Every package `names` needs, from the installed tree: dependencies must be installed, optional ones only if they are.
// npm installs flat, so each package is looked up at the top of node_modules.
export function packageClosure(root, names) {
    const found = new Set();
    const visit = (name, neededBy) => {
        if (found.has(name)) return;
        const file = join(root, 'node_modules', name, 'package.json');
        if (!existsSync(file)) throw new Error(`Not installed: ${name}${neededBy ? ` (needed by ${neededBy})` : ''}`);
        found.add(name);
        const pkg = JSON.parse(readFileSync(file, 'utf8'));
        for (const dependency of Object.keys(pkg.dependencies ?? {})) visit(dependency, name);
        for (const optional of Object.keys(pkg.optionalDependencies ?? {})) {
            if (existsSync(join(root, 'node_modules', optional, 'package.json'))) visit(optional, name);
        }
    };
    for (const name of names) visit(name, null);
    return [...found].sort();
}

async function main() {
    const root = process.cwd();
    const { build } = await import('esbuild');
    rmSync(PACK_DIR, { recursive: true, force: true });
    await build({
        entryPoints: ['scripts/visual/ci.ts'],
        outfile: join(PACK_DIR, 'ci.mjs'),
        bundle: true,
        platform: 'node',
        target: 'node22',
        format: 'esm',
        external: EXTERNAL,
        // Bundled CommonJS code calls require(); give it one.
        banner: { js: "import { createRequire as __createRequire } from 'node:module'; const require = __createRequire(import.meta.url);" },
        logLevel: 'warning',
    });
    const packages = packageClosure(root, EXTERNAL);
    for (const name of packages) cpSync(join(root, 'node_modules', name), join(PACK_DIR, 'node_modules', name), { recursive: true, dereference: true });
    process.stdout.write(`Packed ${packages.length} packages into ${PACK_DIR}: ${packages.join(', ')}\n`);
}

if (resolve(process.argv[1] ?? '') === fileURLToPath(import.meta.url)) {
    main().catch((error) => {
        console.error(error);
        process.exit(1);
    });
}
```

- [ ] **Step 4: Run the test to see it pass**

Run: `npx vitest run scripts/visual/pack.test.ts`
Expected: PASS, 2 tests.

If TypeScript complains about importing `./pack.mjs` (no types), add `scripts/visual/pack.d.mts`:

```ts
export const PACK_DIR: string;
export const EXTERNAL: string[];
export function packageClosure(root: string, names: string[]): string[];
```

- [ ] **Step 5: Ignore the pack and try it**

Add this line to `.gitignore`, next to the existing `visual-output` line:

```
/visual-runtime/
```

Then run:

```bash
node scripts/visual/pack.mjs
node visual-runtime/ci.mjs selfcheck
```

Expected: `Packed N packages into visual-runtime: ...`, then `playwright-core ok, sharp 0.35.5`. On Windows the pack holds the Windows sharp binary, which is expected: CI builds it on Linux. Check the size with `du -sh visual-runtime` (expected: about 30 MB).

Run: `npx tsc --noEmit` and `npx eslint scripts/visual` (expected: clean).

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json scripts/visual/pack.mjs scripts/visual/pack.test.ts .gitignore
git commit -m "KAN-237: Build the visual runtime pack"
```

Add `scripts/visual/pack.d.mts` to the `git add` if Step 4 needed it.

---

### Task 8: Workflow tests for the new visual check

**Files:**
- Modify: `scripts/visual/workflows.test.ts`

Write the tests first. They fail until Task 9 changes the workflow.

- [ ] **Step 1: Update the shared and visual-check tests**

In `scripts/visual/workflows.test.ts`:

1. In `describe('base build for the recheck')`, `it('uses the -sb key and the base folder in every cache step')`: only base cache steps hold the base. Change the filter line to:

```ts
            const steps = workflow
                .split(/\n {12}- /)
                .filter((step) => step.includes('actions/cache/') && !step.includes('visual-timings-'));
```

2. Replace `it('keeps the base build in the saved base folder')` with:

```ts
    it('keeps the base build in the saved base folder', () => {
        const report = job(read('visual-check'), 'report');
        expect(report).toMatch(/name: visual-base-storybook\n\s+path: visual-output\/base\/storybook\n/);
        expect(report).toContain('join --storybook visual-output/base/storybook --dir visual-output/base');
        const save = job(read('visual-baseline'), 'save');
        expect(save).toMatch(/name: visual-storybook\n\s+path: visual-output\/base\/storybook\n/);
        expect(save).toContain('join --storybook visual-output/base/storybook --dir visual-output/base');
    });
```

3. In `describe('visual-check workflow')`:
   - change the `finish` test to `expect(job(check, 'finish')).toContain('needs: [start, build, capture, report, publish]');`
   - replace `it.each(['build', 'capture', 'compare'])('gives %s, which runs PR code, read access only and no secrets', ...)` with:

```ts
    it.each(['build', 'capture', 'report'])('gives %s, which runs PR code, read access only and no secrets', (name) => {
        const block = job(check, name);
        expect(block).toMatch(/permissions:\n\s+contents: read\n/);
        expect(block).not.toMatch(/: write\b/);
        expect(block).not.toContain('secrets.');
        if (block.includes('actions/checkout')) expect(block).toContain('persist-credentials: false');
    });

    it('lets only build and capture read Actions runs, to find and wait for the baseline run', () => {
        expect(job(check, 'build')).toMatch(/permissions:\n\s+contents: read\n\s+actions: read\n/);
        expect(job(check, 'capture')).toMatch(/permissions:\n\s+contents: read\n\s+actions: read\n/);
        expect(job(check, 'report')).not.toContain('actions: read');
    });
```

   - replace `it('gives compare time to capture the whole base itself ...')` and `it('compares only after every share is captured, and publishes after that')` with:

```ts
    it('joins the report only after every share has compared, and publishes after that', () => {
        expect(job(check, 'report')).toContain('needs: [build, capture]');
        expect(job(check, 'publish')).toContain('needs: report');
        expect(check).not.toMatch(/\n {4}compare:\n/);
    });

    it('runs npm ci only in the build job', () => {
        expect(job(check, 'build')).toContain('run: npm ci');
        for (const name of ['capture', 'report']) expect(job(check, name), name).not.toMatch(/\bnpm (ci|install|run)\b/);
    });

    it('packs the runtime in build and runs every later step from it', () => {
        const build = job(check, 'build');
        expect(build).toContain('node scripts/visual/pack.mjs');
        expect(build).toContain('node visual-runtime/ci.mjs selfcheck');
        expect(build).toMatch(/name: visual-runtime\n\s+path: visual-runtime\n/);
        for (const name of ['capture', 'report']) expect(job(check, name), name).toContain('node visual-runtime/ci.mjs');
    });

    it('plans the shares from the newest timings', () => {
        const build = job(check, 'build');
        expect(build).toContain('restore-keys: visual-timings-');
        expect(build).toContain('plan --storybook storybook-static --timings visual-output/timings/timings.json --out visual-runtime/share-plan.json');
        expect(job(check, 'capture')).toContain('--plan visual-runtime/share-plan.json');
        expect(job(check, 'report')).toContain('key: visual-timings-${{ github.run_id }}');
    });

    it('works out the base state in build', () => {
        expect(job(check, 'build')).toContain('base-state --sha "$BASE_SHA" --cache-hit "$CACHE_HIT"');
    });

    it('waits up to 15 minutes for a baseline run that is still going', () => {
        const capture = job(check, 'capture');
        expect(capture).toContain("if: needs.build.outputs.base-state == 'pending'");
        expect(capture).toContain('wait-baseline --run "$BASELINE_RUN" --minutes 15');
        expect(capture.indexOf('wait-baseline')).toBeGreaterThan(capture.indexOf(' capture --share'));
    });

    it('captures its share of the base only when the cache still has none', () => {
        const capture = job(check, 'capture');
        expect(capture).toContain("if: steps.restore.outputs.cache-hit != 'true'");
        expect(capture).toContain('capture-base --share "$SHARE" --plan visual-runtime/share-plan.json --storybook visual-output/base-storybook --out visual-output/base');
    });

    it('compares in each share', () => {
        expect(job(check, 'capture')).toContain('compare-share --share "$SHARE"');
        expect(job(check, 'report')).toContain('join-report --plan visual-runtime/share-plan.json --storybook storybook-static --base "$BASE_SHA"');
    });
```

4. In `describe('base build for the recheck')`, replace `it('captures the base shares from a build outside the base folder, ...')` with:

```ts
    it('captures the base shares from a build outside the base folder, because a share clears that folder first', () => {
        expect(job(read('visual-check'), 'capture')).toContain('--storybook visual-output/base-storybook --out visual-output/base');
    });
```

(The text is the same; it now matches the `capture-base` line.)

- [ ] **Step 2: Run them to see the new ones fail**

Run: `npx vitest run scripts/visual/workflows.test.ts`
Expected: FAIL on the new visual-check tests (`No job named report`, and so on). The `visual-baseline` tests still pass.

Don't commit yet. Task 9 commits the tests with the workflow.

---

### Task 9: The new `visual-check.yml`

**Files:**
- Modify: `.github/workflows/visual-check.yml`

- [ ] **Step 1: Replace the `build`, `capture` and `compare` jobs**

Keep `on`, `concurrency`, `permissions`, `env`, `start` and `publish` as they are, except `publish`'s `needs`. Replace the jobs from `build:` up to (not including) the comment above `publish:` with the following:

```yaml
    # build, capture and report run the PR's dependencies and build, so they have no write access and no secrets.
    build:
        needs: start
        runs-on: ubuntu-latest
        timeout-minutes: 15
        container: mcr.microsoft.com/playwright:v1.55.0-noble
        permissions:
            contents: read
            actions: read
        outputs:
            base-sha: ${{ steps.base.outputs.sha }}
            base-key: ${{ steps.lookup.outputs.cache-primary-key }}
            base-state: ${{ steps.state.outputs.state }}
            baseline-run: ${{ steps.state.outputs.run-id }}
        steps:
            - uses: actions/checkout@v7
              with:
                  ref: ${{ github.event.pull_request.head.sha }}
                  fetch-depth: 0
                  persist-credentials: false

            - uses: actions/setup-node@v7
              with:
                  node-version: 22
                  cache: npm

            - run: git config --global --add safe.directory "$GITHUB_WORKSPACE"

            - run: npm ci

            # The report page is committed as one built file, so make sure it matches its source.
            # A branch from before the built page has no source to check, and the published page comes from the base anyway.
            - run: |
                  if [ ! -f scripts/visual/report/vite.config.ts ]; then
                      echo "::notice::This branch has no report page source yet, so the page check is skipped."
                      exit 0
                  fi
                  npm run visual:page
                  if [ -n "$(git status --porcelain -- scripts/visual/report/dist)" ]; then
                      echo "::error::The report page is out of date. Run npm run visual:page and commit the result."
                      exit 1
                  fi

            # The event's base is staging as it was at this push. Staging fetched now can already hold
            # this PR if it merged meanwhile, and the merge-base would then be the PR's own head.
            - id: base
              run: echo "sha=$(git merge-base "$EVENT_BASE_SHA" HEAD)" >> "$GITHUB_OUTPUT"
              env:
                  EVENT_BASE_SHA: ${{ github.event.pull_request.base.sha }}

            - id: lookup
              uses: actions/cache/restore@v6
              with:
                  path: visual-output/base
                  key: visual-base-${{ steps.base.outputs.sha }}-${{ hashFiles('scripts/visual/capture.ts', 'scripts/visual/stories.ts', 'scripts/visual/config.ts') }}-pw1.55.0-sb
                  lookup-only: true

            # A staging push's baseline run may still be capturing this base. The shares wait for it instead of capturing it again.
            - id: state
              run: npm run visual:ci -- base-state --sha "$BASE_SHA" --cache-hit "$CACHE_HIT"
              env:
                  BASE_SHA: ${{ steps.base.outputs.sha }}
                  CACHE_HIT: ${{ steps.lookup.outputs.cache-hit }}
                  GITHUB_TOKEN: ${{ github.token }}

            - run: npm run visual:ci -- build

            - uses: actions/upload-artifact@v7
              with:
                  name: visual-storybook
                  path: storybook-static
                  retention-days: 1
                  if-no-files-found: error

            - run: node scripts/visual/pack.mjs

            - run: node visual-runtime/ci.mjs selfcheck

            # The newest timings from any earlier run. None means the plan deals round-robin.
            - uses: actions/cache/restore@v6
              with:
                  path: visual-output/timings
                  key: visual-timings-${{ github.run_id }}
                  restore-keys: visual-timings-

            - run: npm run visual:ci -- plan --storybook storybook-static --timings visual-output/timings/timings.json --out visual-runtime/share-plan.json

            - uses: actions/upload-artifact@v7
              with:
                  name: visual-runtime
                  path: visual-runtime
                  retention-days: 1
                  if-no-files-found: error

            # No saved captures for the base yet, so a share may have to capture its part of it.
            - if: steps.lookup.outputs.cache-hit != 'true'
              run: npm run visual:ci -- build-base --base "$BASE_SHA"
              env:
                  BASE_SHA: ${{ steps.base.outputs.sha }}

            - if: steps.lookup.outputs.cache-hit != 'true'
              uses: actions/upload-artifact@v7
              with:
                  name: visual-base-storybook
                  path: visual-output/base-storybook
                  retention-days: 1
                  if-no-files-found: error

    # Each share captures its planned stories, gets the base and compares its own captures on its own runner.
    capture:
        needs: build
        runs-on: ubuntu-latest
        timeout-minutes: 45
        container: mcr.microsoft.com/playwright:v1.55.0-noble
        permissions:
            contents: read
            actions: read
        strategy:
            matrix:
                share: [1, 2, 3, 4, 5, 6]
        env:
            SHARE: ${{ strategy.job-index }}/${{ strategy.job-total }}
            BASE_SHA: ${{ needs.build.outputs.base-sha }}
        steps:
            - uses: actions/setup-node@v7
              with:
                  node-version: 22

            - uses: actions/download-artifact@v8
              with:
                  name: visual-runtime
                  path: visual-runtime

            - uses: actions/download-artifact@v8
              with:
                  name: visual-storybook
                  path: storybook-static

            - run: node visual-runtime/ci.mjs capture --share "$SHARE" --plan visual-runtime/share-plan.json --storybook storybook-static --out visual-output/head

            - if: needs.build.outputs.base-state == 'pending'
              run: node visual-runtime/ci.mjs wait-baseline --run "$BASELINE_RUN" --minutes 15
              env:
                  BASELINE_RUN: ${{ needs.build.outputs.baseline-run }}
                  GITHUB_TOKEN: ${{ github.token }}

            - id: restore
              if: needs.build.outputs.base-state != 'missing'
              uses: actions/cache/restore@v6
              with:
                  path: visual-output/base
                  key: ${{ needs.build.outputs.base-key }}

            - if: steps.restore.outputs.cache-hit != 'true'
              uses: actions/download-artifact@v8
              with:
                  name: visual-base-storybook
                  path: visual-output/base-storybook

            - if: steps.restore.outputs.cache-hit != 'true'
              run: node visual-runtime/ci.mjs capture-base --share "$SHARE" --plan visual-runtime/share-plan.json --storybook visual-output/base-storybook --out visual-output/base

            - if: steps.restore.outputs.cache-hit != 'true'
              uses: actions/upload-artifact@v7
              with:
                  name: visual-base-share-${{ strategy.job-index }}
                  path: visual-output/base
                  retention-days: 1
                  compression-level: 0
                  if-no-files-found: error

            # The saved base holds all captures and its build. A base this share took itself holds only its part,
            # and its build sits outside the base folder.
            - run: |
                  if [ "$CACHE_HIT" = "true" ]; then
                      node visual-runtime/ci.mjs compare-share --share "$SHARE" --plan visual-runtime/share-plan.json --base "$BASE_SHA" --base-records visual-output/base/captures.json --base-storybook visual-output/base/storybook
                  else
                      node visual-runtime/ci.mjs compare-share --share "$SHARE" --plan visual-runtime/share-plan.json --base "$BASE_SHA" --base-records "visual-output/base/records-${{ strategy.job-index }}.json" --base-storybook visual-output/base-storybook
                  fi
              env:
                  CACHE_HIT: ${{ steps.restore.outputs.cache-hit }}

            - uses: actions/upload-artifact@v7
              with:
                  name: visual-report-share-${{ strategy.job-index }}
                  path: visual-output/report
                  retention-days: 1
                  if-no-files-found: error

    report:
        needs: [build, capture]
        runs-on: ubuntu-latest
        timeout-minutes: 15
        container: mcr.microsoft.com/playwright:v1.55.0-noble
        permissions:
            contents: read
        env:
            BASE_SHA: ${{ needs.build.outputs.base-sha }}
        steps:
            - uses: actions/checkout@v7
              with:
                  ref: ${{ github.event.pull_request.head.sha }}
                  fetch-depth: 0
                  persist-credentials: false

            - uses: actions/setup-node@v7
              with:
                  node-version: 22

            - run: git config --global --add safe.directory "$GITHUB_WORKSPACE"

            - uses: actions/download-artifact@v8
              with:
                  name: visual-runtime
                  path: visual-runtime

            - uses: actions/download-artifact@v8
              with:
                  name: visual-storybook
                  path: storybook-static

            - uses: actions/download-artifact@v8
              with:
                  pattern: visual-report-share-*
                  merge-multiple: true
                  path: visual-output/report

            - run: node visual-runtime/ci.mjs join-report --plan visual-runtime/share-plan.json --storybook storybook-static --base "$BASE_SHA" --timings visual-output/timings/timings.json

            - uses: actions/upload-artifact@v7
              with:
                  name: visual-report
                  path: visual-output/report
                  retention-days: 1

            - uses: actions/cache/save@v6
              with:
                  path: visual-output/timings
                  key: visual-timings-${{ github.run_id }}

            # Saves the base the shares captured, so later PRs on it find it. It never changes this run's result,
            # so a share that found the cache after all (and uploaded no base) only skips the save.
            - id: saved
              if: needs.build.outputs.base-state != 'saved'
              uses: actions/cache/restore@v6
              with:
                  path: visual-output/base
                  key: ${{ needs.build.outputs.base-key }}
                  lookup-only: true

            - if: needs.build.outputs.base-state != 'saved' && steps.saved.outputs.cache-hit != 'true'
              id: base-shares
              continue-on-error: true
              uses: actions/download-artifact@v8
              with:
                  pattern: visual-base-share-*
                  merge-multiple: true
                  path: visual-output/base

            # Kept inside the base folder, so the cache saves it for the base recheck.
            - if: steps.base-shares.outcome == 'success'
              uses: actions/download-artifact@v8
              with:
                  name: visual-base-storybook
                  path: visual-output/base/storybook

            - id: base-join
              if: steps.base-shares.outcome == 'success'
              continue-on-error: true
              run: node visual-runtime/ci.mjs join --storybook visual-output/base/storybook --dir visual-output/base --sha "$BASE_SHA"

            - if: steps.base-join.outcome == 'success'
              uses: actions/cache/save@v6
              with:
                  path: visual-output/base
                  key: ${{ needs.build.outputs.base-key }}
```

The report artifact is uploaded before the base save, so `publish` doesn't wait on it. `publish` still needs the whole job, so the save adds its time. That only happens on runs that captured the base.

- [ ] **Step 2: Point publish and finish at the report job**

- In `publish`, change `needs: compare` to `needs: report`.
- In `finish`, change `needs: [start, build, capture, compare, publish]` to `needs: [start, build, capture, report, publish]`.

- [ ] **Step 3: Run the workflow tests**

Run: `npx vitest run scripts/visual/workflows.test.ts`
Expected: PASS, every test, including the `visual-baseline` ones.

Check the YAML parses: `node -e "require('js-yaml')" 2>/dev/null && node -e "require('js-yaml').load(require('fs').readFileSync('.github/workflows/visual-check.yml','utf8'))"`. If `js-yaml` isn't installed, use `npx --yes yaml@2.6.1 valid < .github/workflows/visual-check.yml`. Expected: no error.

- [ ] **Step 4: Commit**

```bash
git add .github/workflows/visual-check.yml scripts/visual/workflows.test.ts
git commit -m "KAN-237: Compare in each share and join the report in a small job"
```

---

### Task 10: The baseline workflow

**Files:**
- Modify: `.github/workflows/visual-baseline.yml`
- Modify: `scripts/visual/workflows.test.ts`

- [ ] **Step 1: Write the failing tests**

Add to `describe('visual-baseline workflow')` in `scripts/visual/workflows.test.ts`:

```ts
    it('runs npm ci only in the build job, and only when the base is not saved', () => {
        expect(job(baseline, 'build')).toContain('run: npm ci');
        for (const name of ['capture', 'save']) expect(job(baseline, name), name).not.toMatch(/\bnpm (ci|install|run)\b/);
    });

    it('captures from the share plan with the runtime pack', () => {
        expect(job(baseline, 'build')).toContain('node scripts/visual/pack.mjs');
        expect(job(baseline, 'capture')).toContain(
            'node visual-runtime/ci.mjs capture --share "$SHARE" --plan visual-runtime/share-plan.json --storybook storybook-static --out visual-output/base',
        );
    });

    it('saves the timings for the next plan', () => {
        const save = job(baseline, 'save');
        expect(save).toContain('--timings visual-output/timings/timings.json');
        expect(save).toContain('key: visual-timings-${{ github.run_id }}');
    });
```

Run: `npx vitest run scripts/visual/workflows.test.ts`
Expected: the three new tests FAIL.

- [ ] **Step 2: Replace the three jobs in `visual-baseline.yml`**

Keep the header (`name`, `on`, `concurrency`, `permissions`) and replace `jobs:` and everything under it with:

```yaml
jobs:
    build:
        runs-on: ubuntu-latest
        timeout-minutes: 15
        container: mcr.microsoft.com/playwright:v1.55.0-noble
        outputs:
            key: ${{ steps.lookup.outputs.cache-primary-key }}
            saved: ${{ steps.lookup.outputs.cache-hit }}
        steps:
            - uses: actions/checkout@v7
              with:
                  persist-credentials: false

            - id: lookup
              uses: actions/cache/restore@v6
              with:
                  path: visual-output/base
                  key: visual-base-${{ github.sha }}-${{ hashFiles('scripts/visual/capture.ts', 'scripts/visual/stories.ts', 'scripts/visual/config.ts') }}-pw1.55.0-sb
                  lookup-only: true

            - if: steps.lookup.outputs.cache-hit != 'true'
              uses: actions/setup-node@v7
              with:
                  node-version: 22
                  cache: npm

            - if: steps.lookup.outputs.cache-hit != 'true'
              run: git config --global --add safe.directory "$GITHUB_WORKSPACE"

            - if: steps.lookup.outputs.cache-hit != 'true'
              run: npm ci

            - if: steps.lookup.outputs.cache-hit != 'true'
              run: npm run visual:ci -- build

            - if: steps.lookup.outputs.cache-hit != 'true'
              uses: actions/upload-artifact@v7
              with:
                  name: visual-storybook
                  path: storybook-static
                  retention-days: 1
                  if-no-files-found: error

            - if: steps.lookup.outputs.cache-hit != 'true'
              run: node scripts/visual/pack.mjs

            - if: steps.lookup.outputs.cache-hit != 'true'
              run: node visual-runtime/ci.mjs selfcheck

            - if: steps.lookup.outputs.cache-hit != 'true'
              uses: actions/cache/restore@v6
              with:
                  path: visual-output/timings
                  key: visual-timings-${{ github.run_id }}
                  restore-keys: visual-timings-

            - if: steps.lookup.outputs.cache-hit != 'true'
              run: npm run visual:ci -- plan --storybook storybook-static --timings visual-output/timings/timings.json --out visual-runtime/share-plan.json

            - if: steps.lookup.outputs.cache-hit != 'true'
              uses: actions/upload-artifact@v7
              with:
                  name: visual-runtime
                  path: visual-runtime
                  retention-days: 1
                  if-no-files-found: error

    capture:
        needs: build
        if: needs.build.outputs.saved != 'true'
        runs-on: ubuntu-latest
        timeout-minutes: 20
        container: mcr.microsoft.com/playwright:v1.55.0-noble
        strategy:
            matrix:
                share: [1, 2, 3, 4, 5, 6]
        env:
            SHARE: ${{ strategy.job-index }}/${{ strategy.job-total }}
        steps:
            - uses: actions/setup-node@v7
              with:
                  node-version: 22

            - uses: actions/download-artifact@v8
              with:
                  name: visual-runtime
                  path: visual-runtime

            - uses: actions/download-artifact@v8
              with:
                  name: visual-storybook
                  path: storybook-static

            - run: node visual-runtime/ci.mjs capture --share "$SHARE" --plan visual-runtime/share-plan.json --storybook storybook-static --out visual-output/base

            - uses: actions/upload-artifact@v7
              with:
                  name: visual-base-share-${{ strategy.job-index }}
                  path: visual-output/base
                  retention-days: 1
                  compression-level: 0
                  if-no-files-found: error

    save:
        needs: [build, capture]
        runs-on: ubuntu-latest
        timeout-minutes: 10
        container: mcr.microsoft.com/playwright:v1.55.0-noble
        steps:
            - uses: actions/setup-node@v7
              with:
                  node-version: 22

            - uses: actions/download-artifact@v8
              with:
                  name: visual-runtime
                  path: visual-runtime

            # Kept inside the base folder, so the cache saves it for the base recheck.
            - uses: actions/download-artifact@v8
              with:
                  name: visual-storybook
                  path: visual-output/base/storybook

            - uses: actions/download-artifact@v8
              with:
                  pattern: visual-base-share-*
                  merge-multiple: true
                  path: visual-output/base

            - run: node visual-runtime/ci.mjs join --storybook visual-output/base/storybook --dir visual-output/base --sha "$GITHUB_SHA" --timings visual-output/timings/timings.json

            - uses: actions/cache/save@v6
              with:
                  path: visual-output/base
                  key: ${{ needs.build.outputs.key }}

            - uses: actions/cache/save@v6
              with:
                  path: visual-output/timings
                  key: visual-timings-${{ github.run_id }}
```

- [ ] **Step 3: Run the workflow tests**

Run: `npx vitest run scripts/visual/workflows.test.ts`
Expected: PASS, every test.

- [ ] **Step 4: Commit**

```bash
git add .github/workflows/visual-baseline.yml scripts/visual/workflows.test.ts
git commit -m "KAN-237: Capture the baseline from the share plan with the runtime pack"
```

---

### Task 11: Full local checks

- [ ] **Step 1: Run every check**

```bash
npx tsc --noEmit
npx eslint .
npx vitest run scripts/visual
npx vitest run
```

Expected: `tsc` exit 0; `eslint` no errors (the two known warnings in other files are fine); `scripts/visual` all pass; the full suite passes, apart from load timeouts in the save-my-date editor files that pass when run alone. Re-run any failing file on its own and record the result.

- [ ] **Step 2: Check `next build` is unaffected**

Run: `npx next build` (expected: completes). This branch changes no app code, but the Done-when list asks for it. If `next build` modifies `AGENTS.md` or other tracked files, revert them with `git checkout -- <file>`.

- [ ] **Step 3: Update the docs if they describe the jobs**

Run: `grep -n "compare\|capture job\|shares" docs/storybook.md`. If a paragraph describes the CI jobs, update it to the new layout: build packs the runtime and plans shares; each share captures, gets the base and compares; `report` joins. Keep it to the facts that changed. Commit with `KAN-237: Describe the new visual check jobs` if anything changed.

---

### Task 12: Live runs and the PR

Every step that pushes, opens a PR or changes a ticket needs the owner's go-ahead in chat first.

- [ ] **Step 1: Ask the owner before pushing**

Ask in a popup whether to push the branch and open the PR (`KAN-237: Trim the visual check pipeline` into `staging`). Wait for a yes.

- [ ] **Step 2: Push and open the PR**

```bash
git fetch origin staging && git merge --no-edit origin/staging
git push -u origin claude/kan-237-visual-pipeline-trims
```

Open the PR into `staging` with a body covering: what changed, the expected times, the live-check table (filled in as runs finish), and the note that the first run captures the base once because `capture.ts` changed. Name only KAN-237 in the body.

- [ ] **Step 3: Record the before times**

From `gh run list --workflow visual-check.yml --status success --limit 6`, record each job's minutes (start/build/slowest capture/compare/publish) for the PR body's "before" column.

- [ ] **Step 4: Run 1, the cold base**

The first run has no saved base under the new key (`capture.ts` changed). Expected:
- `base-state` is `missing` or `pending`;
- the shares capture the base;
- `report` saves the base;
- the check is green with 0 changes (this PR changes no story).

Record the job times.

- [ ] **Step 5: Runs 2–4, saved base, unchanged code**

Push an empty commit (`git commit --allow-empty -m "KAN-237: Re-run the visual check"`) three times, one after the other finishes. Expected each time:
- `base-state=saved`;
- green, 0 changes;
- the capture shares within about 1 min of each other, apart from runner speed;
- total run about 9–11 min.

Record the job times. Any false alarm counts as a failure of this ticket: find the cause before going on.

- [ ] **Step 6: The baseline wait**

Right after a `staging` merge (anyone's), merge `staging` into the branch and push. Expected: `build` reports `Baseline run <id> is still going`, the shares wait (`Waiting up to 15 min`), then `The baseline run finished`, restore the cache and compare. Record the wait time. If no staging merge comes along, say so in the PR and leave this row open for the owner.

- [ ] **Step 7: A real change is still caught**

Commit a throwaway visual change to one simple story (for example, one Tailwind colour class in a `components/common` story). Expected: red, exactly that story's captures changed. Send the owner the report link, then revert the change in a new commit and confirm the next run is green.

- [ ] **Step 8: Hand over**

Bring the branch up to date with `staging`, re-run the checks, fill in the PR's before/after table and send the owner the PR link. Only the owner approves visual checks and decides on merging.
