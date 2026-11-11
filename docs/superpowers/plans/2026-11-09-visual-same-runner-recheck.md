# KAN-184 Same-Runner Base Recheck Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (one subagent at a time, never in parallel: the repo's CLAUDE.md asks for that) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stop machine differences (like the rounded-corner smoothing on PR #280) from showing up as changes, by capturing a still-different story's base again on the compare runner before reporting it.

**Architecture:** `buildReport` gets an optional `baseRecheck: { dir, retake }`. After a capture's head retakes still differ, it captures that story's base once more from the base Storybook build, on the same runner, and compares again: a match clears it, a difference is reported with the fresh base as the before image and the saved base's hash as `beforeHash`. The base build is kept inside the saved base folder (`visual-output/base/storybook/`), so the existing cache step keeps it, and the cache key gets a `-sb` ending. Every capture record notes its CPU, for the run log only.

**Tech Stack:** TypeScript run through jiti, playwright-core 1.55.0, sharp, vitest, GitHub Actions (cache v6, artifacts v7/v8).

Design: `docs/superpowers/specs/2026-11-09-visual-same-runner-recheck-design.md` (approved 2026-11-09).

---

## Starting point

This plan is written against KAN-166 (PR #281, branch `claude/kan-166-parallel-capture`). Start only after #281 has merged into `staging`.

- [ ] **Bring the branch up to date**

```bash
git switch claude/kan-184-same-runner-recheck
git fetch origin staging
git merge origin/staging
```

Expected: the merge brings in `scripts/visual/steps.ts`, `scripts/visual/ci.ts` and `scripts/visual/shards.ts`. Check:

```bash
ls scripts/visual/steps.ts scripts/visual/ci.ts scripts/visual/shards.ts
```

- [ ] **Install:** `npm ci` (or link `node_modules` to a checkout whose `package-lock.json` matches).

- [ ] **Check the code still matches this plan.** Each task below quotes the code it replaces. If #281 changed in review and a quoted block isn't there, stop and adjust the task before going on.

- [ ] **Baseline:** `npx vitest run scripts/visual` passes before any change.

## Files

| File | Change | Responsibility |
| --- | --- | --- |
| `scripts/visual/types.ts` | modify | `machine` on `CaptureRecord` |
| `scripts/visual/capture.ts` | modify | `MACHINE` (this runner's CPU), set on every record |
| `scripts/visual/capture.test.ts` | modify | test for `MACHINE` |
| `scripts/visual/report.ts` | modify | `BaseRecheck` type, the recheck after the head retakes |
| `scripts/visual/report.test.ts` | modify | recheck tests |
| `scripts/visual/steps.ts` | modify | `commit.txt` in every build, `withBaseRecheck` (only from the base commit's build), the base build kept in the base folder, `Capturing on <CPU>` |
| `scripts/visual/steps.test.ts` | new | tests for `withBaseRecheck` and `writeBuildCommit` |
| `scripts/visual/ci.ts` | modify | the compare step passes the base build folder |
| `.github/workflows/visual-check.yml` | modify | `-sb` key ending, base build in `visual-output/base/storybook` |
| `.github/workflows/visual-baseline.yml` | modify | the same |
| `scripts/visual/workflows.test.ts` | modify | checks for both |

`run.ts` doesn't change: local runs pass no base build, so they never recheck.

---

### Task 1: The CPU on every capture

**Files:**
- Modify: `scripts/visual/types.ts`
- Modify: `scripts/visual/capture.ts`
- Test: `scripts/visual/capture.test.ts`

- [ ] **Step 1: Write the failing test**

In `scripts/visual/capture.test.ts`, change the imports and add a test at the end of the file:

```ts
// @vitest-environment node
import { cpus } from 'node:os';

import { describe, expect, it } from 'vitest';

import { allFailedSoFar, MACHINE } from './capture';
```

```ts
describe('MACHINE', () => {
    it('names this machine by its CPU model', () => {
        expect(MACHINE).toBe(cpus()[0]?.model.trim() || 'unknown');
        expect(MACHINE.length).toBeGreaterThan(0);
    });
});
```

- [ ] **Step 2: Run it to make sure it fails**

Run: `npx vitest run scripts/visual/capture.test.ts`
Expected: FAIL, `MACHINE` is undefined.

- [ ] **Step 3: Add `machine` to the record type**

In `scripts/visual/types.ts`, replace:

```ts
export type CaptureRecord = CaptureTarget & { status: 'ok' | 'failed'; hash: string | null; error: string | null };
```

with:

```ts
// `machine` is the CPU that took the capture, for the run log. Records saved before it existed have none.
export type CaptureRecord = CaptureTarget & { status: 'ok' | 'failed'; hash: string | null; error: string | null; machine?: string };
```

- [ ] **Step 4: Set it on every capture**

In `scripts/visual/capture.ts`, add the import next to the other `node:` imports:

```ts
import { mkdirSync, writeFileSync } from 'node:fs';
import { cpus } from 'node:os';
import { join } from 'node:path';
```

Add after the imports, before `type StoryStatus`:

```ts
// The CPU this runs on. Two runners can smooth edges differently, so the log names the machine behind each capture.
const cpuModel = cpus()[0]?.model.trim();
export const MACHINE = cpuModel ? cpuModel : 'unknown';
```

In `captureTarget`, replace:

```ts
    if ('error' in result) return { ...target, status: 'failed', hash: null, error: result.error };
    writeFileSync(join(outDir, `${target.id}.png`), result.png);
    return { ...target, status: 'ok', hash: hashRaw(await decodePng(result.png)), error: null };
```

with:

```ts
    if ('error' in result) return { ...target, status: 'failed', hash: null, error: result.error, machine: MACHINE };
    writeFileSync(join(outDir, `${target.id}.png`), result.png);
    return { ...target, status: 'ok', hash: hashRaw(await decodePng(result.png)), error: null, machine: MACHINE };
```

- [ ] **Step 5: Run the tests**

Run: `npx vitest run scripts/visual`
Expected: PASS. `machine` is optional, so the other tests' records still type-check, and `targetOf` in `report.ts` keeps it out of the manifest.

- [ ] **Step 6: Commit**

```bash
git add scripts/visual/types.ts scripts/visual/capture.ts scripts/visual/capture.test.ts
git commit -m "KAN-184: note the CPU behind each capture

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: The base recheck in `buildReport`

**Files:**
- Modify: `scripts/visual/report.ts`
- Test: `scripts/visual/report.test.ts`

- [ ] **Step 1: Let the test helper pass a recheck**

In `scripts/visual/report.test.ts`, change the report import:

```ts
import { type BaseRecheck, buildReport } from './report';
```

and replace the `run` helper:

```ts
    const run = (baseRecords: CaptureRecord[], headRecords: CaptureRecord[], retake: (t: CaptureTarget) => Promise<CaptureRecord> = noRetake) =>
        buildReport({
            baseDir,
            headDir,
            reportDir,
            baseRecords,
            headRecords,
            baseSha: 'b',
            headSha: 'h',
            missingStories: ['components/x/Y.tsx'],
            retake,
        });
```

with:

```ts
    const run = (
        baseRecords: CaptureRecord[],
        headRecords: CaptureRecord[],
        retake: (t: CaptureTarget) => Promise<CaptureRecord> = noRetake,
        baseRecheck?: BaseRecheck,
    ) =>
        buildReport({
            baseDir,
            headDir,
            reportDir,
            baseRecords,
            headRecords,
            baseSha: 'b',
            headSha: 'h',
            missingStories: ['components/x/Y.tsx'],
            retake,
            baseRecheck,
        });

    // The first pixel of a report image. webp is lossy, so callers allow a step or two.
    const firstGray = async (image: string | undefined) => (await sharp(join(reportDir, image as string)).raw().toBuffer())[0];
```

The existing tests pass no `baseRecheck`, so they keep covering today's behaviour.

- [ ] **Step 2: Write the failing tests**

Add this block at the end of the outer `describe('buildReport', ...)`, before its closing `});`:

```ts
    describe('base recheck', () => {
        let recheckDir: string;

        beforeEach(() => {
            recheckDir = join(root, 'recheck');
            mkdirSync(recheckDir);
        });

        afterEach(() => vi.restoreAllMocks());

        // Every head retake gives the same shot, like a real change or a machine difference.
        const sameHead = (head: CaptureRecord) => vi.fn(async () => head);

        it('clears a capture whose base, taken again here, matches the head', async () => {
            const log = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
            const base = { ...(await record(baseDir, 'a', 10)), machine: 'CPU A' };
            const head = await record(headDir, 'a', 200);
            const retakeBase = vi.fn(async () => ({ ...(await record(recheckDir, 'a', 200)), machine: 'CPU B' }));
            const manifest = await run([base], [head], sameHead(head), { dir: recheckDir, retake: retakeBase });
            expect(manifest.entries).toEqual([]);
            expect(retakeBase).toHaveBeenCalledTimes(1);
            expect(retakeBase).toHaveBeenCalledWith(target('a'));
            expect(log).toHaveBeenCalledWith('Cleared by a base recheck: a (base: CPU A, here: CPU B)\n');
        });

        it('reports a capture that still differs against the base taken here, with the saved base hash', async () => {
            const base = await record(baseDir, 'a', 10);
            const head = await record(headDir, 'a', 200);
            const fresh = await record(recheckDir, 'a', 100);
            const manifest = await run([base], [head], sameHead(head), { dir: recheckDir, retake: vi.fn(async () => fresh) });
            const [entry] = manifest.entries;
            expect(entry.state).toBe('changed');
            expect(entry.beforeHash).toBe(base.hash);
            expect(entry.afterHash).toBe(head.hash);
            expect(Math.abs((await firstGray(entry.images.before)) - 100)).toBeLessThanOrEqual(2);
        });

        it('keeps the change against the saved base when the base recheck fails', async () => {
            const log = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
            const base = await record(baseDir, 'a', 10);
            const head = await record(headDir, 'a', 200);
            const failing = vi.fn(async (t: CaptureTarget): Promise<CaptureRecord> => ({ ...t, status: 'failed', hash: null, error: 'Boom on base' }));
            const manifest = await run([base], [head], sameHead(head), { dir: recheckDir, retake: failing });
            const [entry] = manifest.entries;
            expect(entry.state).toBe('changed');
            expect(entry.beforeHash).toBe(base.hash);
            expect(Math.abs((await firstGray(entry.images.before)) - 10)).toBeLessThanOrEqual(2);
            expect(log).toHaveBeenCalledWith('Base recheck failed: a: Boom on base\n');
        });

        it('does not recheck the base when a head retake clears the capture', async () => {
            const base = await record(baseDir, 'a', 10);
            const flaky = await record(headDir, 'a', 200);
            const retakeBase = vi.fn(async (t: CaptureTarget) => record(recheckDir, t.id, 10));
            const manifest = await run([base], [flaky], vi.fn(async () => record(headDir, 'a', 10)), { dir: recheckDir, retake: retakeBase });
            expect(manifest.entries).toEqual([]);
            expect(retakeBase).not.toHaveBeenCalled();
        });

        it('rechecks the base only within the retake limit', async () => {
            const ids = Array.from({ length: MAX_RETAKEN_CAPTURES + 2 }, (_, index) => `story-${index}`);
            const baseRecords = await Promise.all(ids.map((id) => record(baseDir, id, 10)));
            const headRecords = await Promise.all(ids.map((id) => record(headDir, id, 200)));
            const retake = vi.fn(async (t: CaptureTarget) => headRecords.find((item) => item.id === t.id) as CaptureRecord);
            const retakeBase = vi.fn(async (t: CaptureTarget) => record(recheckDir, t.id, 100));
            const manifest = await run(baseRecords, headRecords, retake, { dir: recheckDir, retake: retakeBase });
            expect(manifest.counts.changed).toBe(ids.length);
            expect(retake).toHaveBeenCalledTimes(MAX_RETAKEN_CAPTURES * RETAKES);
            expect(retakeBase).toHaveBeenCalledTimes(MAX_RETAKEN_CAPTURES);
        });
    });
```

- [ ] **Step 3: Run them to make sure they fail**

Run: `npx vitest run scripts/visual/report.test.ts`
Expected: a type error or FAIL: `BaseRecheck` isn't exported and `buildReport` ignores `baseRecheck`, so the first test reports a change instead of clearing it.

- [ ] **Step 4: Add the input**

In `scripts/visual/report.ts`, replace:

```ts
type BuildReportInput = {
    baseDir: string;
    headDir: string;
    reportDir: string;
    baseRecords: CaptureRecord[];
    headRecords: CaptureRecord[];
    baseSha: string;
    headSha: string;
    missingStories: string[];
    retake: (target: CaptureTarget) => Promise<CaptureRecord>;
};
```

with:

```ts
// Captures a story's base version again on this machine, writing the PNG into `dir`.
export type BaseRecheck = { dir: string; retake: (target: CaptureTarget) => Promise<CaptureRecord> };

type BuildReportInput = {
    baseDir: string;
    headDir: string;
    reportDir: string;
    baseRecords: CaptureRecord[];
    headRecords: CaptureRecord[];
    baseSha: string;
    headSha: string;
    missingStories: string[];
    retake: (target: CaptureTarget) => Promise<CaptureRecord>;
    // Without it, a capture that still differs after its retakes is reported as it is.
    baseRecheck?: BaseRecheck;
};
```

and in `buildReport`, replace:

```ts
    const { baseDir, headDir, reportDir, baseRecords, headRecords, baseSha, headSha, missingStories, retake } = input;
```

with:

```ts
    const { baseDir, headDir, reportDir, baseRecords, headRecords, baseSha, headSha, missingStories, retake, baseRecheck } = input;
```

- [ ] **Step 5: Recheck after the head retakes**

In `scripts/visual/report.ts`, replace the whole `compareWithRetakes` function and its comment:

```ts
    // A capture that differs is retaken, and counts as changed only if every attempt differs.
    // A retake that fails ends as failed, because the story is broken, not different.
    async function compareWithRetakes(
        base: CaptureRecord,
        head: CaptureRecord,
    ): Promise<{ record: CaptureRecord; diff: ImageDiff } | CaptureRecord | null> {
        const before = readFileSync(pngPath(baseDir, base.id));
        let record = head;
        let diff = await comparePngs(before, readFileSync(pngPath(headDir, head.id)));
        if (!isChanged(diff)) return null;
        const attempts = retakesLeft > 0 ? RETAKES : 0;
        retakesLeft -= 1;
        for (let attempt = 0; attempt < attempts && isChanged(diff); attempt += 1) {
            const retaken = await retake(targetOf(head));
            if (retaken.status !== 'ok') return retaken;
            record = retaken;
            diff = await comparePngs(before, readFileSync(pngPath(headDir, head.id)));
        }
        if (isChanged(diff)) return { record, diff };
        process.stdout.write(`Cleared by a retake: ${head.id}\n`);
        return null;
    }
```

with:

```ts
    // A capture that differs is retaken, and counts as changed only if every attempt differs.
    // A retake that fails ends as failed, because the story is broken, not different.
    // One unit of the limit covers a capture's retakes and its base recheck together.
    async function compareWithRetakes(
        base: CaptureRecord,
        head: CaptureRecord,
    ): Promise<{ record: CaptureRecord; diff: ImageDiff } | CaptureRecord | null> {
        const before = readFileSync(pngPath(baseDir, base.id));
        let record = head;
        let diff = await comparePngs(before, readFileSync(pngPath(headDir, head.id)));
        if (!isChanged(diff)) return null;
        const attempts = retakesLeft > 0 ? RETAKES : 0;
        retakesLeft -= 1;
        for (let attempt = 0; attempt < attempts && isChanged(diff); attempt += 1) {
            const retaken = await retake(targetOf(head));
            if (retaken.status !== 'ok') return retaken;
            record = retaken;
            diff = await comparePngs(before, readFileSync(pngPath(headDir, head.id)));
        }
        if (!isChanged(diff)) {
            process.stdout.write(`Cleared by a retake: ${head.id}\n`);
            return null;
        }
        if (attempts === 0 || !baseRecheck) return { record, diff };
        return recheckBase(baseRecheck, base, record, diff);
    }

    // The base can come from another runner, and two runners can smooth edges differently.
    // Taking the base again here puts both sides on this machine, so only a real change is left.
    // A recheck that fails keeps the change against the saved base: it never hides one.
    async function recheckBase(
        { dir, retake: retakeBase }: BaseRecheck,
        base: CaptureRecord,
        record: CaptureRecord,
        diff: ImageDiff,
    ): Promise<{ record: CaptureRecord; diff: ImageDiff } | null> {
        const fresh = await retakeBase(targetOf(base));
        if (fresh.status !== 'ok') {
            process.stdout.write(`Base recheck failed: ${base.id}: ${fresh.error ?? 'unknown error'}\n`);
            return { record, diff };
        }
        const freshDiff = await comparePngs(readFileSync(pngPath(dir, base.id)), readFileSync(pngPath(headDir, record.id)));
        if (isChanged(freshDiff)) return { record, diff: freshDiff };
        process.stdout.write(`Cleared by a base recheck: ${base.id} (base: ${base.machine ?? 'unknown'}, here: ${fresh.machine ?? 'unknown'})\n`);
        return null;
    }
```

`changedEntry(base, result.record, result.diff)` stays as it is: `beforeHash` comes from the saved `base` record, and the images from the diff, which is the fresh base's diff when the recheck ran.

- [ ] **Step 6: Run the tests**

Run: `npx vitest run scripts/visual/report.test.ts`
Expected: PASS, the 5 new tests and all the old ones.

- [ ] **Step 7: Commit**

```bash
git add scripts/visual/report.ts scripts/visual/report.test.ts
git commit -m "KAN-184: recheck a still-different capture against its base taken on this runner

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Serve the base build for the recheck

**Files:**
- Modify: `scripts/visual/steps.ts`
- Create: `scripts/visual/steps.test.ts`
- Modify: `scripts/visual/ci.ts`

- [ ] **Step 1: Write the failing tests**

Create `scripts/visual/steps.test.ts`:

```ts
// @vitest-environment node
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { Browser } from 'playwright-core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { BaseRecheck } from './report';
import { withBaseRecheck, writeBuildCommit } from './steps';

const BASE_SHA = 'a'.repeat(40);
const OTHER_SHA = 'b'.repeat(40);

// Hands back the recheck `withBaseRecheck` gave the work, so a test can look at it.
const given = async (recheck: BaseRecheck | undefined) => recheck;

describe('withBaseRecheck', () => {
    let root: string;
    // Nothing is captured in these tests, so the browser is never used.
    const browser = {} as Browser;

    beforeEach(() => {
        root = mkdtempSync(join(tmpdir(), 'visual-steps-'));
    });

    afterEach(() => {
        vi.restoreAllMocks();
        rmSync(root, { recursive: true, force: true });
    });

    // A base build with a story index, and the commit it says it was built from.
    function baseBuild(commit?: string): string {
        const storybook = join(root, 'storybook');
        mkdirSync(storybook);
        writeFileSync(join(storybook, 'index.json'), JSON.stringify({ v: 5, entries: {} }));
        if (commit) writeFileSync(join(storybook, 'commit.txt'), commit);
        return storybook;
    }

    it('gives no recheck without a base build', async () => {
        expect(await withBaseRecheck(browser, undefined, BASE_SHA, join(root, 'recheck'), given)).toBeUndefined();
    });

    it('gives no recheck when the base build has no story index', async () => {
        const storybook = join(root, 'storybook');
        mkdirSync(storybook);
        expect(await withBaseRecheck(browser, storybook, BASE_SHA, join(root, 'recheck'), given)).toBeUndefined();
    });

    it('gives no recheck when the base build is from another commit', async () => {
        const log = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
        const storybook = baseBuild(OTHER_SHA);
        expect(await withBaseRecheck(browser, storybook, BASE_SHA, join(root, 'recheck'), given)).toBeUndefined();
        expect(log).toHaveBeenCalledWith(`No base recheck: the base build is for ${OTHER_SHA}, not ${BASE_SHA}\n`);
    });

    it('gives no recheck when the base build does not say its commit', async () => {
        const log = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
        const storybook = baseBuild();
        expect(await withBaseRecheck(browser, storybook, BASE_SHA, join(root, 'recheck'), given)).toBeUndefined();
        expect(log).toHaveBeenCalledWith(`No base recheck: the base build is for unknown, not ${BASE_SHA}\n`);
    });

    it('rechecks into an emptied folder of its own when the base build is from the base commit', async () => {
        const storybook = baseBuild(BASE_SHA);
        const recheckDir = join(root, 'recheck');
        mkdirSync(recheckDir);
        writeFileSync(join(recheckDir, 'old.png'), '');
        const recheck = await withBaseRecheck(browser, storybook, BASE_SHA, recheckDir, given);
        expect(recheck?.dir).toBe(recheckDir);
        expect(existsSync(recheckDir)).toBe(true);
        expect(existsSync(join(recheckDir, 'old.png'))).toBe(false);
    });
});

describe('writeBuildCommit', () => {
    it('writes the commit the build was made from', () => {
        const dir = mkdtempSync(join(tmpdir(), 'visual-commit-'));
        try {
            writeBuildCommit('.', dir);
            expect(readFileSync(join(dir, 'commit.txt'), 'utf8')).toBe(execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim());
        } finally {
            rmSync(dir, { recursive: true, force: true });
        }
    });
});
```

- [ ] **Step 2: Run them to make sure they fail**

Run: `npx vitest run scripts/visual/steps.test.ts`
Expected: FAIL, `withBaseRecheck` and `writeBuildCommit` are not exported.

- [ ] **Step 3: Add the folders, `writeBuildCommit` and `withBaseRecheck`**

In `scripts/visual/steps.ts`, change the imports:

```ts
import { captureAll, captureTarget, launchBrowser, MACHINE } from './capture';
import { findMissingStories } from './missingStories';
import { type BaseRecheck, buildReport } from './report';
```

Below `export const BASE_STORYBOOK_DIR = join(OUT, 'base-storybook');`, add:

```ts
// The base build kept inside the base folder, so the cache saves it with the captures for the base recheck.
// The capture jobs can't use it: a share clears its output folder, which is the base folder, before capturing.
export const SAVED_BASE_STORYBOOK_DIR = join(BASE_DIR, 'storybook');
// Where the recheck puts the base it takes again. Outside the base folder, so the saved base stays as captured.
export const BASE_RECHECK_DIR = join(OUT, 'base-recheck');
```

Replace `buildStorybook`:

```ts
export function buildStorybook(cwd: string, outDir: string) {
    execSync(`npx storybook build --quiet -o "${outDir}"`, { cwd, stdio: 'inherit', env: { ...process.env, STORYBOOK_DISABLE_TELEMETRY: '1' } });
}
```

with:

```ts
export function buildStorybook(cwd: string, outDir: string) {
    execSync(`npx storybook build --quiet -o "${outDir}"`, { cwd, stdio: 'inherit', env: { ...process.env, STORYBOOK_DISABLE_TELEMETRY: '1' } });
    writeBuildCommit(cwd, outDir);
}

// Notes which commit a build is from, so the base recheck never captures from another commit's build.
export function writeBuildCommit(cwd: string, outDir: string) {
    writeFileSync(resolve(cwd, outDir, 'commit.txt'), execFileSync('git', ['rev-parse', 'HEAD'], { cwd, encoding: 'utf8' }).trim());
}
```

Every build goes through `buildStorybook`: the head build in CI and locally, the baseline's build, and `buildCommitStorybook`'s base build, whose temporary worktree is checked out at the base commit (it passes an absolute `outDir`, which `resolve` keeps as it is).

Below `withStorybook`, add:

```ts
// Serves the base build while `work` runs, so a capture can have its base taken again on this machine.
// Without the build or its story index there is nothing to capture from, and the report runs without a recheck.
// A build from another commit could clear a real change, so it is never used.
export async function withBaseRecheck<Result>(
    browser: Browser,
    storybookDir: string | undefined,
    baseSha: string,
    outDir: string,
    work: (baseRecheck: BaseRecheck | undefined) => Promise<Result>,
): Promise<Result> {
    if (!storybookDir || !existsSync(join(storybookDir, 'index.json'))) return work(undefined);
    const commitFile = join(storybookDir, 'commit.txt');
    const commit = existsSync(commitFile) ? readFileSync(commitFile, 'utf8').trim() : 'unknown';
    if (commit !== baseSha) {
        print(`No base recheck: the base build is for ${commit}, not ${baseSha}`);
        return work(undefined);
    }
    rmSync(outDir, { recursive: true, force: true });
    mkdirSync(outDir, { recursive: true });
    const server = await serveStatic(storybookDir);
    try {
        return await work({ dir: outDir, retake: (target) => captureTarget(browser, server.origin, target, outDir) });
    } finally {
        await server.close();
    }
}
```

- [ ] **Step 4: Run the new tests**

Run: `npx vitest run scripts/visual/steps.test.ts`
Expected: PASS.

- [ ] **Step 5: Name the CPU when a browser starts**

In `withStorybook`, replace:

```ts
    const browser = await launchBrowser();
    try {
```

with:

```ts
    const browser = await launchBrowser();
    print(`Capturing on ${MACHINE}`);
    try {
```

- [ ] **Step 6: Keep the base build in the base folder when the compare step builds the base itself**

In `loadOrBuildBase`, replace:

```ts
// Reuses saved captures when they belong to this commit. Otherwise builds and captures that commit.
// A commit from before Storybook existed has no captures, so all stories count as new.
```

with:

```ts
// Reuses saved captures when they belong to this commit. Otherwise builds and captures that commit,
// keeping its build in the base folder for the base recheck. A commit from before Storybook existed
// has no captures, so all stories count as new.
```

and:

```ts
    const records = buildCommitStorybook(baseSha, BASE_STORYBOOK_DIR) ? await captureBuild(browser, BASE_STORYBOOK_DIR, BASE_DIR) : [];
```

with:

```ts
    const records = buildCommitStorybook(baseSha, SAVED_BASE_STORYBOOK_DIR) ? await captureBuild(browser, SAVED_BASE_STORYBOOK_DIR, BASE_DIR) : [];
```

This runs when the compare job's cache restore missed (the cache was dropped after the build job looked it up). Without this change, the cache it then saves under the new key would have no build, and later runs for that base would never recheck.

- [ ] **Step 7: Pass the recheck to the report**

Replace the whole `writeReport` function and its comment:

```ts
// Compares the head captures with the base and writes the report. `origin` serves the head build, for retakes.
export async function writeReport(browser: Browser, origin: string, headRecords: CaptureRecord[], baseSha: string) {
    const headSha = git('rev-parse', 'HEAD');
    rmSync(REPORT_DIR, { recursive: true, force: true });
    const baseRecords = await loadOrBuildBase(browser, baseSha);
    const added = git('diff', '--diff-filter=A', '--name-only', baseSha, 'HEAD').split('\n').filter(Boolean);
    const manifest = await buildReport({
        baseDir: BASE_DIR,
        headDir: HEAD_DIR,
        reportDir: REPORT_DIR,
        baseRecords,
        headRecords,
        baseSha,
        headSha,
        missingStories: findMissingStories(added, existsSync),
        retake: (target) => captureTarget(browser, origin, target, HEAD_DIR),
    });
```

with:

```ts
// Compares the head captures with the base and writes the report. `origin` serves the head build, for retakes.
// With `baseStorybookDir`, a capture that still differs after its retakes has its base taken again on this machine.
export async function writeReport(browser: Browser, origin: string, headRecords: CaptureRecord[], baseSha: string, baseStorybookDir?: string) {
    const headSha = git('rev-parse', 'HEAD');
    rmSync(REPORT_DIR, { recursive: true, force: true });
    const baseRecords = await loadOrBuildBase(browser, baseSha);
    const added = git('diff', '--diff-filter=A', '--name-only', baseSha, 'HEAD').split('\n').filter(Boolean);
    const manifest = await withBaseRecheck(browser, baseStorybookDir, baseSha, BASE_RECHECK_DIR, (baseRecheck) =>
        buildReport({
            baseDir: BASE_DIR,
            headDir: HEAD_DIR,
            reportDir: REPORT_DIR,
            baseRecords,
            headRecords,
            baseSha,
            headSha,
            missingStories: findMissingStories(added, existsSync),
            retake: (target) => captureTarget(browser, origin, target, HEAD_DIR),
            baseRecheck,
        }),
    );
```

The rest of `writeReport` (copying the page, printing the counts and failures) stays.

`withBaseRecheck` runs after `loadOrBuildBase`, so a base the compare step built itself is there to recheck from.

- [ ] **Step 8: Make the CI compare step recheck**

In `scripts/visual/ci.ts`, add `SAVED_BASE_STORYBOOK_DIR` to the `./steps` import (keep the list sorted):

```ts
import {
    BASE_STORYBOOK_DIR,
    buildCommitStorybook,
    buildStorybook,
    HEAD_DIR,
    print,
    readRecords,
    SAVED_BASE_STORYBOOK_DIR,
    saveRecords,
    STORYBOOK_DIR,
    targetsFrom,
    withStorybook,
    writeReport,
} from './steps';
```

Replace:

```ts
async function compare() {
    const baseSha = required('base');
    const headRecords = readRecords(HEAD_DIR);
    await withStorybook(STORYBOOK_DIR, (browser, origin) => writeReport(browser, origin, headRecords, baseSha));
}
```

with:

```ts
// The base and head shots come from other runners than this one. A capture that still differs after its
// retakes has its base taken again here, from the base build saved with the base captures.
async function compare() {
    const baseSha = required('base');
    const headRecords = readRecords(HEAD_DIR);
    await withStorybook(STORYBOOK_DIR, (browser, origin) => writeReport(browser, origin, headRecords, baseSha, SAVED_BASE_STORYBOOK_DIR));
}
```

In the usage comment at the top of `ci.ts`, replace:

```ts
//   npm run visual:ci -- compare --base <sha>                               compare visual-output/head with the base and write the report
```

with:

```ts
//   npm run visual:ci -- compare --base <sha>                               compare visual-output/head with the base and write the report,
//                                                                           rechecking from the base build in visual-output/base/storybook
```

`run.ts` stays as it is: it calls `writeReport` without a base build folder, so local runs never recheck.

- [ ] **Step 9: Type-check and run the tests**

Run: `npx tsc --noEmit`
Expected: no errors.

Run: `npx vitest run scripts/visual`
Expected: PASS.

- [ ] **Step 10: Commit**

```bash
git add scripts/visual/steps.ts scripts/visual/steps.test.ts scripts/visual/ci.ts
git commit -m "KAN-184: serve the base build to the compare step for the recheck

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Keep the base build in the cache

**Files:**
- Modify: `.github/workflows/visual-check.yml`
- Modify: `.github/workflows/visual-baseline.yml`
- Test: `scripts/visual/workflows.test.ts`

- [ ] **Step 1: Write the failing tests**

In `scripts/visual/workflows.test.ts`, add after the `describe('cache key', ...)` block:

```ts
describe('base build for the recheck', () => {
    it('ends every cache key with -sb, so a cache saved without the base build is never used', () => {
        for (const name of ['visual-check', 'visual-baseline']) {
            const keys = read(name).match(/key: visual-base-.*$/gm) ?? [];
            expect(keys.length, name).toBeGreaterThan(0);
            for (const key of keys) expect(key.endsWith(`-pw${version}-sb`), key).toBe(true);
        }
    });

    it('keeps the base build in the saved base folder', () => {
        const compare = job(read('visual-check'), 'compare');
        expect(compare).toMatch(/name: visual-base-storybook\n\s+path: visual-output\/base\/storybook\n/);
        expect(compare).toContain('join --storybook visual-output/base/storybook --dir visual-output/base');
        const save = job(read('visual-baseline'), 'save');
        expect(save).toMatch(/name: visual-storybook\n\s+path: visual-output\/base\/storybook\n/);
        expect(save).toContain('join --storybook visual-output/base/storybook --dir visual-output/base');
    });

    it('captures the base shares from a build outside the base folder, because a share clears that folder first', () => {
        expect(job(read('visual-check'), 'capture')).toContain('--storybook visual-output/base-storybook --out visual-output/base');
    });
});
```

- [ ] **Step 2: Run them to make sure they fail**

Run: `npx vitest run scripts/visual/workflows.test.ts`
Expected: the first two new tests FAIL, the third passes (it guards what's already there).

- [ ] **Step 3: Change `visual-check.yml`**

In the `build` job's `lookup` step, replace:

```yaml
                  key: visual-base-${{ steps.base.outputs.sha }}-${{ hashFiles('scripts/visual/capture.ts', 'scripts/visual/stories.ts', 'scripts/visual/config.ts') }}-pw1.55.0
```

with:

```yaml
                  key: visual-base-${{ steps.base.outputs.sha }}-${{ hashFiles('scripts/visual/capture.ts', 'scripts/visual/stories.ts', 'scripts/visual/config.ts') }}-pw1.55.0-sb
```

In the `compare` job, replace:

```yaml
            - if: needs.build.outputs.base-saved != 'true'
              uses: actions/download-artifact@v8
              with:
                  name: visual-base-storybook
                  path: visual-output/base-storybook
```

with:

```yaml
            # Kept inside the base folder, so the cache saves it for the base recheck.
            - if: needs.build.outputs.base-saved != 'true'
              uses: actions/download-artifact@v8
              with:
                  name: visual-base-storybook
                  path: visual-output/base/storybook
```

and:

```yaml
              run: npm run visual:ci -- join --storybook visual-output/base-storybook --dir visual-output/base --sha "$BASE_SHA"
```

with:

```yaml
              run: npm run visual:ci -- join --storybook visual-output/base/storybook --dir visual-output/base --sha "$BASE_SHA"
```

Leave the `capture` job's `visual-output/base-storybook` as it is.

- [ ] **Step 4: Change `visual-baseline.yml`**

In the `build` job's `lookup` step, replace:

```yaml
                  key: visual-base-${{ github.sha }}-${{ hashFiles('scripts/visual/capture.ts', 'scripts/visual/stories.ts', 'scripts/visual/config.ts') }}-pw1.55.0
```

with:

```yaml
                  key: visual-base-${{ github.sha }}-${{ hashFiles('scripts/visual/capture.ts', 'scripts/visual/stories.ts', 'scripts/visual/config.ts') }}-pw1.55.0-sb
```

In the `save` job, replace:

```yaml
            - uses: actions/download-artifact@v8
              with:
                  name: visual-storybook
                  path: storybook-static
```

with:

```yaml
            # Kept inside the base folder, so the cache saves it for the base recheck.
            - uses: actions/download-artifact@v8
              with:
                  name: visual-storybook
                  path: visual-output/base/storybook
```

and:

```yaml
            - run: npm run visual:ci -- join --storybook storybook-static --dir visual-output/base --sha "$GITHUB_SHA"
```

with:

```yaml
            - run: npm run visual:ci -- join --storybook visual-output/base/storybook --dir visual-output/base --sha "$GITHUB_SHA"
```

The `capture` job in this file keeps downloading the build to `storybook-static`.

- [ ] **Step 5: Run the tests**

Run: `npx vitest run scripts/visual/workflows.test.ts`
Expected: PASS, the new tests and all of KAN-166's.

- [ ] **Step 6: Commit**

```bash
git add .github/workflows/visual-check.yml .github/workflows/visual-baseline.yml scripts/visual/workflows.test.ts
git commit -m "KAN-184: keep the base build in the base cache

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Every check

- [ ] **Step 1: Bring the branch up to date with `staging`**

```bash
git fetch origin staging
git merge origin/staging
```

If `staging` moved, run `npm ci` when `package-lock.json` changed.

- [ ] **Step 2: Run the checks**

Run each and expect it clean:

```bash
npx tsc --noEmit
```

```bash
npx eslint .
```

Expected: 0 errors. Note any warnings and whether they're in files this branch touches.

```bash
npx vitest run
```

`next build` is Vercel's build of the pushed commit.

- [ ] **Step 3: Check nothing else changed**

```bash
git status --short
```

Expected: empty. If `AGENTS.md` shows up (a local `next dev` or `next build` appends to it), revert it with `git checkout -- AGENTS.md`.

---

### Task 6: Open the PR and check it live

The visual check runs the PR's own workflow file, so the PR's runs test the new flow.

- [ ] **Step 1: Push and open the PR into `staging`**

```bash
git push -u origin claude/kan-184-same-runner-recheck
```

Title: `KAN-184: recheck the base on the same runner`. The body names only KAN-184, covers what changed, the checks from Task 5, and ends with `🤖 Generated with [Claude Code](https://claude.com/claude-code)`.

- [ ] **Step 2: First run (base not saved yet)**

The `-sb` key is new, so no saved base matches it: the shards capture the base and the compare job saves it, with the build, under the PR's cache scope.

When the run is done:

```bash
gh pr checks <PR number>
```

Expected: `visual-regression` green. Then read the compare job's log for the recheck lines and the CPUs:

```bash
gh run view <run id> --log --job <compare job id> | grep -E "Capturing on|base recheck|Cleared by a retake"
```

Write down the CPUs and any `Cleared by a base recheck` lines, and the compare job's time.

- [ ] **Step 3: Two more runs (base from the cache)**

```bash
git commit --allow-empty -m "KAN-184: run the check again

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git push
```

Do this twice, one run at a time. Each run restores the base the first run saved, which was captured on other runners. Expected each time: green, and the same log check as Step 2.

- [ ] **Step 4: A real change must still show**

Add a throwaway background to one story. In `components/common/Logo.stories.tsx`, replace:

```tsx
export const Row: Story = {};
```

with:

```tsx
export const Row: Story = {
    decorators: [
        (Story) => (
            <div style={{ background: '#fde68a' }}>
                <Story />
            </div>
        ),
    ],
};
```

```bash
git add components/common/Logo.stories.tsx
git commit -m "KAN-184: test change to the Logo story, to be undone

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git push
```

Expected: `visual-regression` red, with exactly the 4 Common/Logo Row captures (en and el, mobile and desktop) as changed, and nothing else. Send the owner the report link and say this red check is the planned test. Do not tick the approve box.

- [ ] **Step 5: Undo the test change**

```bash
git revert --no-commit HEAD
git commit -m "KAN-184: undo the test change to the Logo story

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git push
```

Expected: `visual-regression` green again.

- [ ] **Step 6: Report**

Add to the PR body: each run's result, its compare job time, the CPUs seen and the recheck lines. Then hand the PR to the owner. Only the owner merges it, and the visual check's approve box is never ticked by Claude.

After it merges, the first `staging` push saves the base with its build, and PRs started before that build their base once (about 12 minutes).
