# KAN-166 Parallel Capture Implementation Plan

> **For agentic workers:** executed inline in this session with superpowers:executing-plans (the repo's CLAUDE.md asks for no parallel subagents). Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cut the `visual-regression` check from 15–23 min to about 8 by splitting the captures across 6 jobs, and stop runs that start mid-merge from capturing everything twice.

**Architecture:** A `build` job builds Storybook once and uploads it. Six `capture` jobs each take every 6th shot of the sorted list with today's unchanged `captureAll`. A `compare` job joins the shares (failing on any missing or doubled shot) and runs today's `buildReport`, retakes included. `publish` is unchanged. `visual-baseline.yml` uses the same build and capture jobs and a `save` job. New CI steps live in `scripts/visual/ci.ts`; the shared steps move out of `run.ts` into `scripts/visual/steps.ts`; splitting and joining live in `scripts/visual/shards.ts`.

**Tech Stack:** GitHub Actions (matrix, artifacts v7/v8, cache v6), Node 22, jiti, playwright-core 1.55.0, vitest.

Design: `docs/superpowers/specs/2026-11-08-visual-parallel-capture-design.md` (approved 2026-11-08: 6 shares, baseline split too).

---

## Starting point

- [ ] Branch only after PR #280 has merged: `git fetch origin staging && git switch -c claude/kan-166-parallel-capture origin/staging`.
- [ ] Link `node_modules` to an installed checkout whose `package-lock.json` matches, otherwise `npm ci`.
- [ ] Copy the design and this plan into `docs/superpowers/specs/2026-11-08-visual-parallel-capture-design.md` and `docs/superpowers/plans/2026-11-08-visual-parallel-capture.md`. Commit: `KAN-166: add the parallel capture design and plan`.

## Files

| File | Change | Responsibility |
| --- | --- | --- |
| `scripts/visual/shards.ts` | new | parse a share, deal shots into shares, write a share's records, join all shares with a completeness check |
| `scripts/visual/shards.test.ts` | new | unit tests for the above |
| `scripts/visual/steps.ts` | new | steps moved from `run.ts`: build Storybook, build a commit's Storybook, capture a build, load or build the base, write the report |
| `scripts/visual/run.ts` | modify | local commands only, now calling `steps.ts` |
| `scripts/visual/ci.ts` | new | CI steps: `build`, `build-base`, `capture`, `join`, `compare` |
| `package.json` | modify | add `visual:ci` |
| `.github/workflows/visual-check.yml` | modify | `build`, 6 × `capture`, `compare`, `publish`, `finish`; base from the event |
| `.github/workflows/visual-baseline.yml` | modify | `build`, 6 × `capture`, `save` |
| `scripts/visual/workflows.test.ts` | modify | job-level checks |
| `docs/storybook.md`, `docs/superpowers/specs/2026-11-06-visual-regression-tool-design.md` | modify | one line each on the split |

`capture.ts`, `stories.ts` and `config.ts` must not change: they are in the cache key, and changing them would also change the shots.

---

### Task 1: Splitting and joining shares

**Files:** Create `scripts/visual/shards.ts`, `scripts/visual/shards.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// @vitest-environment node
import { existsSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { joinShareFiles, joinShares, parseShare, shareOf, writeShareRecords } from './shards';
import type { CaptureRecord, CaptureTarget } from './types';

const target = (id: string): CaptureTarget => ({ id, storyId: id, title: 'Title', name: id, locale: 'en', width: 'mobile' });
const record = (id: string): CaptureRecord => ({ ...target(id), status: 'ok', hash: `hash-${id}`, error: null });

describe('parseShare', () => {
    it('reads an index and a total', () => {
        expect(parseShare('0/6')).toEqual({ index: 0, total: 6 });
        expect(parseShare('5/6')).toEqual({ index: 5, total: 6 });
    });

    it.each(['6/6', '1', 'a/6', '-1/6', '0/0', '1/6/2', ''])('rejects %j', (value) => {
        expect(() => parseShare(value)).toThrow('Expected a share like 0/6');
    });
});

describe('shareOf', () => {
    const items = Array.from({ length: 14 }, (_, position) => position);
    const allShares = (total: number) => Array.from({ length: total }, (_, index) => shareOf(items, { index, total }));

    it('deals items out by position', () => {
        expect(shareOf(items, { index: 0, total: 6 })).toEqual([0, 6, 12]);
        expect(shareOf(items, { index: 5, total: 6 })).toEqual([5, 11]);
    });

    it('gives every item to exactly one share', () => {
        expect(allShares(6).flat().sort((a, b) => a - b)).toEqual(items);
    });

    it('keeps shares within one item of each other', () => {
        const sizes = allShares(6).map((share) => share.length);
        expect(Math.max(...sizes) - Math.min(...sizes)).toBeLessThanOrEqual(1);
    });

    it('gives everything to a single share', () => {
        expect(shareOf(items, { index: 0, total: 1 })).toEqual(items);
    });
});

describe('joinShares', () => {
    const targets = ['a', 'b', 'c'].map(target);

    it('returns the records in story-list order', () => {
        expect(joinShares(targets, [record('c'), record('a'), record('b')]).map((item) => item.id)).toEqual(['a', 'b', 'c']);
    });

    it('stops when a capture is missing', () => {
        expect(() => joinShares(targets, [record('a'), record('c')])).toThrow('Missing 1 of 3 captures, first: b');
    });

    it('stops when a capture came back twice', () => {
        expect(() => joinShares(targets, [record('a'), record('b'), record('b'), record('c')])).toThrow('Captured twice: b');
    });

    it('stops when a capture is not in the story list', () => {
        expect(() => joinShares(targets, ['a', 'b', 'c', 'd'].map(record))).toThrow('Captured but not in the story list: d');
    });

    it('accepts an empty story list with no records', () => {
        expect(joinShares([], [])).toEqual([]);
    });
});

describe('share files', () => {
    let dir = '';
    afterEach(() => rmSync(dir, { recursive: true, force: true }));

    it('joins every share in a folder and removes their files', () => {
        dir = mkdtempSync(join(tmpdir(), 'shares-'));
        writeShareRecords(dir, 1, [record('b')]);
        writeShareRecords(dir, 0, [record('a'), record('c')]);
        writeFileSync(join(dir, 'a.png'), '');
        expect(joinShareFiles(dir, ['a', 'b', 'c'].map(target)).map((item) => item.id)).toEqual(['a', 'b', 'c']);
        expect(readdirSync(dir)).toEqual(['a.png']);
    });

    it('stops when a share never arrived', () => {
        dir = mkdtempSync(join(tmpdir(), 'shares-'));
        writeShareRecords(dir, 0, [record('a'), record('c')]);
        expect(() => joinShareFiles(dir, ['a', 'b', 'c'].map(target))).toThrow('Missing 1 of 3 captures, first: b');
        expect(existsSync(join(dir, 'records-0.json'))).toBe(true);
    });
});
```

- [ ] **Step 2: Run it and see it fail**

Run: `npx vitest run scripts/visual/shards.test.ts`
Expected: FAIL, `Failed to resolve import "./shards"`.

- [ ] **Step 3: Write `scripts/visual/shards.ts`**

```ts
import { mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import type { CaptureRecord, CaptureTarget } from './types';

export type Share = { index: number; total: number };

// "2/6" is the third of six shares. Indexes start at 0, like GitHub's strategy.job-index.
export function parseShare(value: string): Share {
    const match = /^(\d+)\/(\d+)$/.exec(value);
    const index = Number(match?.[1]);
    const total = Number(match?.[2]);
    if (!match || total < 1 || index >= total) throw new Error(`Expected a share like 0/6, got "${value}"`);
    return { index, total };
}

// Deals the sorted list out like cards. A story's shots sit next to each other in the list,
// so the shots of a slow story land in different shares.
export const shareOf = <Item>(items: Item[], { index, total }: Share): Item[] => items.filter((_, position) => position % total === index);

// Puts every share's records back in story-list order. A missing, doubled or unknown record means
// a share was lost or mixed up, and comparing anyway could hide a change, so the run stops.
export function joinShares(targets: CaptureTarget[], records: CaptureRecord[]): CaptureRecord[] {
    const byId = new Map<string, CaptureRecord>();
    for (const record of records) {
        if (byId.has(record.id)) throw new Error(`Captured twice: ${record.id}`);
        byId.set(record.id, record);
    }
    const missing = targets.filter((target) => !byId.has(target.id)).map((target) => target.id);
    if (missing.length > 0) throw new Error(`Missing ${missing.length} of ${targets.length} captures, first: ${missing[0]}`);
    const known = new Set(targets.map((target) => target.id));
    const unknown = records.find((record) => !known.has(record.id));
    if (unknown) throw new Error(`Captured but not in the story list: ${unknown.id}`);
    return targets.map((target) => byId.get(target.id) as CaptureRecord);
}

const RECORDS_FILE = /^records-\d+\.json$/;

export function writeShareRecords(dir: string, index: number, records: CaptureRecord[]) {
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, `records-${index}.json`), JSON.stringify(records));
}

// Joins the records every share left in `dir`, then removes their files, so the folder looks
// the same as a single-job capture.
export function joinShareFiles(dir: string, targets: CaptureTarget[]): CaptureRecord[] {
    const files = readdirSync(dir).filter((name) => RECORDS_FILE.test(name));
    const records = files.flatMap((name) => JSON.parse(readFileSync(join(dir, name), 'utf8')) as CaptureRecord[]);
    const joined = joinShares(targets, records);
    for (const name of files) rmSync(join(dir, name));
    return joined;
}
```

- [ ] **Step 4: Run the tests and see them pass**

Run: `npx vitest run scripts/visual/shards.test.ts`
Expected: PASS, 19 tests.

- [ ] **Step 5: Commit**

```bash
git add scripts/visual/shards.ts scripts/visual/shards.test.ts
git commit -m "KAN-166: split the captures into shares and join them back with a completeness check"
```

### Task 2: Move the shared steps out of `run.ts`

**Files:** Create `scripts/visual/steps.ts`. Modify `scripts/visual/run.ts` (whole file).

No behaviour change except one: a base commit's Storybook is now built into `visual-output/base-storybook` and captured after its worktree is removed, instead of inside the worktree. The build output is the same.

- [ ] **Step 1: Write `scripts/visual/steps.ts`**

```ts
// Steps shared by the local commands in run.ts and the CI steps in ci.ts.

import { execFileSync, execSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

import type { Browser } from 'playwright-core';

import { captureAll, captureTarget, launchBrowser } from './capture';
import { findMissingStories } from './missingStories';
import { buildReport } from './report';
import { serveStatic } from './server';
import { buildCaptureList, type StoryIndex } from './stories';
import type { CaptureRecord } from './types';

export const OUT = 'visual-output';
export const BASE_DIR = join(OUT, 'base');
export const HEAD_DIR = join(OUT, 'head');
export const REPORT_DIR = join(OUT, 'report');
export const BASE_STORYBOOK_DIR = join(OUT, 'base-storybook');
export const STORYBOOK_DIR = 'storybook-static';

export const print = (line: string) => process.stdout.write(`${line}\n`);

export const git = (...gitArgs: string[]) => execFileSync('git', gitArgs, { encoding: 'utf8' }).trim();

export function buildStorybook(cwd: string, outDir: string) {
    execSync(`npx storybook build --quiet -o "${outDir}"`, { cwd, stdio: 'inherit', env: { ...process.env, STORYBOOK_DISABLE_TELEMETRY: '1' } });
}

export function targetsFrom(storybookDir: string) {
    return buildCaptureList(JSON.parse(readFileSync(join(storybookDir, 'index.json'), 'utf8')) as StoryIndex);
}

export function saveRecords(dir: string, records: CaptureRecord[], sha: string) {
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'captures.json'), JSON.stringify(records));
    writeFileSync(join(dir, 'sha.txt'), sha);
}

export const readRecords = (dir: string) => JSON.parse(readFileSync(join(dir, 'captures.json'), 'utf8')) as CaptureRecord[];

// Serves a built Storybook to a new browser for as long as `work` runs.
export async function withStorybook<Result>(storybookDir: string, work: (browser: Browser, origin: string) => Promise<Result>): Promise<Result> {
    const browser = await launchBrowser();
    try {
        const server = await serveStatic(storybookDir);
        try {
            return await work(browser, server.origin);
        } finally {
            await server.close();
        }
    } finally {
        await browser.close();
    }
}

export async function captureBuild(browser: Browser, storybookDir: string, outDir: string): Promise<CaptureRecord[]> {
    const server = await serveStatic(storybookDir);
    try {
        return await captureAll(browser, server.origin, targetsFrom(storybookDir), outDir);
    } finally {
        await server.close();
    }
}

// Builds a commit's Storybook in a temporary worktree. Returns false for a commit from before Storybook existed.
export function buildCommitStorybook(sha: string, outDir: string): boolean {
    const source = resolve(OUT, 'base-src');
    rmSync(source, { recursive: true, force: true });
    rmSync(outDir, { recursive: true, force: true });
    git('worktree', 'prune');
    git('worktree', 'add', '--detach', source, sha);
    try {
        if (!existsSync(join(source, '.storybook', 'main.ts'))) return false;
        execSync('npm ci', { cwd: source, stdio: 'inherit' });
        buildStorybook(source, resolve(outDir));
        return true;
    } finally {
        // A locked file on Windows must not hide the real error.
        try {
            git('worktree', 'remove', '--force', source);
        } catch (error) {
            console.warn(`Could not remove the temporary worktree ${source}: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
}

// Reuses saved captures when they belong to this commit. Otherwise builds and captures that commit.
// A commit from before Storybook existed has no captures, so all stories count as new.
export async function loadOrBuildBase(browser: Browser, baseSha: string): Promise<CaptureRecord[]> {
    const shaFile = join(BASE_DIR, 'sha.txt');
    if (existsSync(shaFile) && readFileSync(shaFile, 'utf8').trim() === baseSha) {
        print(`Using saved captures for ${baseSha}`);
        return readRecords(BASE_DIR);
    }
    print(`Building captures for ${baseSha}`);
    rmSync(BASE_DIR, { recursive: true, force: true });
    mkdirSync(BASE_DIR, { recursive: true });
    const records = buildCommitStorybook(baseSha, BASE_STORYBOOK_DIR) ? await captureBuild(browser, BASE_STORYBOOK_DIR, BASE_DIR) : [];
    saveRecords(BASE_DIR, records, baseSha);
    return records;
}

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
    copyFileSync(join('scripts', 'visual', 'report', 'dist', 'index.html'), join(REPORT_DIR, 'index.html'));
    const { changed, removed, failed } = manifest.counts;
    print(`${changed} changed, ${manifest.counts.new} new, ${removed} removed, ${failed} failed, of ${manifest.totalCaptures} captures.`);
    for (const entry of manifest.entries.filter((item) => item.state === 'failed')) print(`FAILED ${entry.id}: ${entry.error}`);
}
```

- [ ] **Step 2: Replace `scripts/visual/run.ts`**

```ts
// Captures Storybook and compares it with another commit.
//
//   npm run visual -- --base origin/staging           compare HEAD with where it branched
//   npm run visual -- --base origin/staging --serve   and open the report on a local server
//   npm run visual -- --capture-only                  save HEAD as visual-output/base
//
// Windows renders differently from CI, so a local run only compares with itself.
// CI runs the same steps split across jobs, through ci.ts.

import { rmSync } from 'node:fs';
import { parseArgs } from 'node:util';

import { captureAll, launchBrowser } from './capture';
import { serveStatic } from './server';
import { BASE_DIR, buildStorybook, captureBuild, git, HEAD_DIR, print, REPORT_DIR, saveRecords, STORYBOOK_DIR, targetsFrom, withStorybook, writeReport } from './steps';

const { values: args } = parseArgs({
    options: {
        base: { type: 'string' },
        'capture-only': { type: 'boolean', default: false },
        serve: { type: 'boolean', default: false },
    },
});

async function captureOnly() {
    rmSync(BASE_DIR, { recursive: true, force: true });
    buildStorybook('.', STORYBOOK_DIR);
    const browser = await launchBrowser();
    try {
        saveRecords(BASE_DIR, await captureBuild(browser, STORYBOOK_DIR, BASE_DIR), git('rev-parse', 'HEAD'));
    } finally {
        await browser.close();
    }
}

async function compareWithBase(baseRef: string) {
    const baseSha = git('merge-base', baseRef, 'HEAD');
    rmSync(HEAD_DIR, { recursive: true, force: true });
    buildStorybook('.', STORYBOOK_DIR);
    await withStorybook(STORYBOOK_DIR, async (browser, origin) => {
        const headRecords = await captureAll(browser, origin, targetsFrom(STORYBOOK_DIR), HEAD_DIR);
        await writeReport(browser, origin, headRecords, baseSha);
    });

    if (args.serve) {
        const reportServer = await serveStatic(REPORT_DIR);
        print(`Report: ${reportServer.origin}/index.html (Ctrl+C to stop)`);
    }
}

async function main() {
    if (args['capture-only']) return captureOnly();
    if (!args.base) throw new Error('Pass --base <ref> or --capture-only');
    return compareWithBase(args.base);
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
```

- [ ] **Step 3: Type-check and run the visual tests**

Run: `npx tsc --noEmit && npx vitest run scripts/visual`
Expected: no type errors; all visual tests pass.

A full local `npm run visual` takes two full captures on Windows, so it is not run here. CI run 1 exercises `writeReport`, and run 4 exercises `buildCommitStorybook`. The local `--base` path and the fallback that builds a dropped base share that code; the PR says they were checked by type-check and review only.

- [ ] **Step 4: Commit**

```bash
git add scripts/visual/steps.ts scripts/visual/run.ts
git commit -m "KAN-166: move the shared visual steps out of run.ts"
```

### Task 3: The CI steps

**Files:** Create `scripts/visual/ci.ts`. Modify `package.json` (scripts).

- [ ] **Step 1: Write `scripts/visual/ci.ts`**

```ts
// The visual check's CI steps. The workflows run them in separate jobs, so the captures can be
// split across runners. run.ts runs the same steps in one go for local use.
//
//   npm run visual:ci -- build                                              build HEAD's Storybook into storybook-static
//   npm run visual:ci -- build-base --base <sha>                            build that commit's Storybook into visual-output/base-storybook
//   npm run visual:ci -- capture --share 0/6 --storybook <dir> --out <dir>  capture one share of a build's stories
//   npm run visual:ci -- join --storybook <dir> --dir <dir> --sha <sha>     join the shares' records into captures.json
//   npm run visual:ci -- compare --base <sha>                               compare visual-output/head with the base and write the report

import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseArgs } from 'node:util';

import { captureAll } from './capture';
import { joinShareFiles, parseShare, shareOf, writeShareRecords } from './shards';
import {
    BASE_STORYBOOK_DIR,
    buildCommitStorybook,
    buildStorybook,
    HEAD_DIR,
    print,
    readRecords,
    saveRecords,
    STORYBOOK_DIR,
    targetsFrom,
    withStorybook,
    writeReport,
} from './steps';

const { values: args, positionals } = parseArgs({
    allowPositionals: true,
    options: {
        base: { type: 'string' },
        share: { type: 'string' },
        storybook: { type: 'string' },
        out: { type: 'string' },
        dir: { type: 'string' },
        sha: { type: 'string' },
    },
});

function required(name: keyof typeof args): string {
    const value = args[name];
    if (typeof value !== 'string' || value === '') throw new Error(`Pass --${name}`);
    return value;
}

// A commit from before Storybook existed gets an empty story list, so every head story counts as new.
function buildBase() {
    if (buildCommitStorybook(required('base'), BASE_STORYBOOK_DIR)) return;
    mkdirSync(BASE_STORYBOOK_DIR, { recursive: true });
    writeFileSync(join(BASE_STORYBOOK_DIR, 'index.json'), JSON.stringify({ v: 5, entries: {} }));
}

async function captureShare() {
    const share = parseShare(required('share'));
    const storybookDir = required('storybook');
    const outDir = required('out');
    rmSync(outDir, { recursive: true, force: true });
    const targets = shareOf(targetsFrom(storybookDir), share);
    print(`Share ${share.index + 1} of ${share.total}: ${targets.length} captures`);
    const records = await withStorybook(storybookDir, (browser, origin) => captureAll(browser, origin, targets, outDir));
    writeShareRecords(outDir, share.index, records);
}

function joinRecords() {
    const dir = required('dir');
    const joined = joinShareFiles(dir, targetsFrom(required('storybook')));
    saveRecords(dir, joined, required('sha'));
    print(`Joined ${joined.length} captures`);
}

async function compare() {
    const baseSha = required('base');
    const headRecords = readRecords(HEAD_DIR);
    await withStorybook(STORYBOOK_DIR, (browser, origin) => writeReport(browser, origin, headRecords, baseSha));
}

const steps: Record<string, () => unknown> = {
    build: () => buildStorybook('.', STORYBOOK_DIR),
    'build-base': buildBase,
    capture: captureShare,
    join: joinRecords,
    compare,
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

- [ ] **Step 2: Add the script to `package.json`**, after `"visual:page"`:

```json
        "visual:ci": "jiti scripts/visual/ci.ts",
```

- [ ] **Step 3: Smoke-test the steps locally on a slice**

Run each, in order (`build` takes about 30 s; capture of 1/100 is about 19 shots):

```bash
npm run visual:ci -- build
npm run visual:ci -- capture --share 0/100 --storybook storybook-static --out visual-output/smoke
npm run visual:ci -- join --storybook storybook-static --dir visual-output/smoke --sha test
npm run visual:ci -- nonsense
```

Expected: capture prints `Share 1 of 100: 19 captures` and writes `records-0.json`; join fails with `Missing … captures, first: …` (only one share of 100 is there) and leaves `records-0.json`; the last fails with `Pass one step: build, build-base, capture, join, compare`. Then `rm -rf visual-output/smoke`.

- [ ] **Step 4: Type-check, lint, test**

Run: `npx tsc --noEmit && npx eslint scripts/visual && npx vitest run scripts/visual`
Expected: clean.

- [ ] **Step 5: Commit**

```bash
git add scripts/visual/ci.ts package.json
git commit -m "KAN-166: add CI steps to build, capture a share, join shares and compare"
```

### Task 4: Workflow tests first

**Files:** Modify `scripts/visual/workflows.test.ts` (whole file).

- [ ] **Step 1: Replace the file**

```ts
// @vitest-environment node
import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

const version = (JSON.parse(readFileSync('package.json', 'utf8')) as { devDependencies: Record<string, string> }).devDependencies['playwright-core'];
const container = `container: mcr.microsoft.com/playwright:v${version}-noble`;

// A Windows checkout can have CRLF line endings.
const read = (name: string) => readFileSync(`.github/workflows/${name}.yml`, 'utf8').replace(/\r\n/g, '\n');

const JOB_LINE = /^ {4}([a-z-]+):$/gm;

const jobNames = (workflow: string) => [...workflow.slice(workflow.indexOf('\njobs:\n')).matchAll(JOB_LINE)].map((match) => match[1]);

// The text of one job, from its name to the next job.
function job(workflow: string, name: string): string {
    const jobs = workflow.slice(workflow.indexOf('\njobs:\n'));
    const start = jobs.indexOf(`\n    ${name}:\n`);
    if (start === -1) throw new Error(`No job named ${name}`);
    const rest = jobs.slice(start + 1);
    const next = rest.slice(1).search(/\n {4}[a-z-]+:\n/);
    return next === -1 ? rest : rest.slice(0, next + 1);
}

describe.each(['visual-check', 'visual-baseline'])('%s workflow', (name) => {
    const workflow = read(name);

    it('uses the container matching playwright-core', () => {
        expect(workflow).toContain(container);
    });

    it('uses the same Playwright version in the cache key', () => {
        expect(workflow).toContain(`-pw${version}`);
    });

    it('keeps every cache step in the Playwright container, so a saved cache can be found again', () => {
        const withCache = jobNames(workflow).filter((jobName) => job(workflow, jobName).includes('actions/cache/'));
        expect(withCache.length).toBeGreaterThan(0);
        for (const jobName of withCache) expect(job(workflow, jobName), jobName).toContain(container);
    });

    it('captures in 6 shares', () => {
        const capture = job(workflow, 'capture');
        expect(capture).toContain('share: [1, 2, 3, 4, 5, 6]');
        expect(capture).toContain('SHARE: ${{ strategy.job-index }}/${{ strategy.job-total }}');
        expect(capture).toContain('--share "$SHARE"');
    });
});

describe('cache key', () => {
    it('hashes the same capture files in both workflows', () => {
        const hashes = ['visual-check', 'visual-baseline'].flatMap((name) => read(name).match(/hashFiles\([^)]*\)/g) ?? []);
        expect(hashes).toEqual([
            "hashFiles('scripts/visual/capture.ts', 'scripts/visual/stories.ts', 'scripts/visual/config.ts')",
            "hashFiles('scripts/visual/capture.ts', 'scripts/visual/stories.ts', 'scripts/visual/config.ts')",
        ]);
    });
});

describe('deploy key', () => {
    it('publishes with the scripts from the base commit', () => {
        const publish = job(read('visual-check'), 'publish');
        expect(publish).toContain('ref: ${{ github.event.pull_request.base.sha }}');
        expect(publish).not.toContain('head.sha');
    });

    it('never builds in the job that holds the deploy key', () => {
        expect(job(read('visual-check'), 'publish')).not.toMatch(/\b(npm|npx|pnpm|yarn|vite)\b/);
    });

    it('cleans up with the scripts from staging', () => {
        const cleanup = read('visual-cleanup');
        expect(cleanup).toContain('pull_request:');
        expect(cleanup).not.toMatch(/^\s+pull_request_target:/m);
        expect(cleanup).toContain('types: [closed]');
        expect(cleanup).toContain('branches: [staging]');
        expect(cleanup).toContain('ref: ${{ github.event.pull_request.base.ref }}');
    });
});

describe('visual-check workflow', () => {
    const check = read('visual-check');

    it('reports a cancelled or timed out run', () => {
        expect(job(check, 'finish')).toContain('if: failure() || cancelled()');
    });

    it('reports a failure in any job', () => {
        expect(job(check, 'finish')).toContain('needs: [start, build, capture, compare, publish]');
    });

    it('takes the base from the PR event, so a merge that lands meanwhile cannot move it', () => {
        const build = job(check, 'build');
        expect(build).toContain('git merge-base "$EVENT_BASE_SHA" HEAD');
        expect(build).toContain('EVENT_BASE_SHA: ${{ github.event.pull_request.base.sha }}');
        expect(check).not.toContain('origin/$BASE_REF');
    });

    it.each(['build', 'capture', 'compare'])('gives %s, which runs PR code, read access only and no secrets', (name) => {
        const block = job(check, name);
        expect(block).toMatch(/permissions:\n\s+contents: read\n/);
        expect(block).not.toMatch(/: write\b/);
        expect(block).not.toContain('secrets.');
        expect(block).toContain('persist-credentials: false');
    });

    it('compares only after every share is captured, and publishes after that', () => {
        expect(job(check, 'compare')).toContain('needs: [build, capture]');
        expect(job(check, 'publish')).toContain('needs: compare');
    });

    it('fails when the committed report page is out of date', () => {
        const build = job(check, 'build');
        expect(build).toContain('npm run visual:page');
        expect(build).toContain('git status --porcelain -- scripts/visual/report/dist)');
        expect(build).toContain('exit 1');
        expect(build.indexOf('npm ci')).toBeLessThan(build.indexOf('npm run visual:page'));
    });

    it('skips the page check on a branch from before the built page', () => {
        const build = job(check, 'build');
        const guard = build.indexOf('if [ ! -f scripts/visual/report/vite.config.ts ]; then');
        expect(guard).toBeGreaterThan(-1);
        expect(guard).toBeLessThan(build.indexOf('npm run visual:page'));
        expect(build).toContain('::notice::This branch has no report page source yet, so the page check is skipped.');
    });
});

describe('visual-baseline workflow', () => {
    const baseline = read('visual-baseline');

    it('captures only when the base is not saved yet', () => {
        expect(job(baseline, 'capture')).toContain("if: needs.build.outputs.saved != 'true'");
    });

    it('saves after every share is captured', () => {
        expect(job(baseline, 'save')).toContain('needs: [build, capture]');
    });
});
```

- [ ] **Step 2: Run it and see the new checks fail against the old workflows**

Run: `npx vitest run scripts/visual/workflows.test.ts`
Expected: FAIL on `No job named build` (and the others that need the new jobs). The container, version and cleanup checks still pass.

### Task 5: The visual check workflow

**Files:** Modify `.github/workflows/visual-check.yml` (replace the `capture:` job; `start`, `publish` and `finish` keep their steps).

- [ ] **Step 1: Replace the old `capture:` job with these three jobs**, keeping the page check step exactly as #280 wrote it:

```yaml
    # build, capture and compare run the PR's dependencies and build, so they have no write access and no secrets.
    build:
        needs: start
        runs-on: ubuntu-latest
        timeout-minutes: 15
        container: mcr.microsoft.com/playwright:v1.55.0-noble
        permissions:
            contents: read
        outputs:
            base-sha: ${{ steps.base.outputs.sha }}
            base-key: ${{ steps.lookup.outputs.cache-primary-key }}
            base-saved: ${{ steps.lookup.outputs.cache-hit }}
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

            # (page check step from #280, unchanged)

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
                  key: visual-base-${{ steps.base.outputs.sha }}-${{ hashFiles('scripts/visual/capture.ts', 'scripts/visual/stories.ts', 'scripts/visual/config.ts') }}-pw1.55.0
                  lookup-only: true

            - run: npm run visual:ci -- build

            - uses: actions/upload-artifact@v7
              with:
                  name: visual-storybook
                  path: storybook-static
                  retention-days: 1
                  if-no-files-found: error

            # No saved captures for the base, so the capture jobs take them too.
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

    capture:
        needs: build
        runs-on: ubuntu-latest
        timeout-minutes: 20
        container: mcr.microsoft.com/playwright:v1.55.0-noble
        permissions:
            contents: read
        strategy:
            matrix:
                share: [1, 2, 3, 4, 5, 6]
        env:
            SHARE: ${{ strategy.job-index }}/${{ strategy.job-total }}
        steps:
            - uses: actions/checkout@v7
              with:
                  ref: ${{ github.event.pull_request.head.sha }}
                  persist-credentials: false

            - uses: actions/setup-node@v7
              with:
                  node-version: 22
                  cache: npm

            - run: git config --global --add safe.directory "$GITHUB_WORKSPACE"

            - run: npm ci

            - uses: actions/download-artifact@v8
              with:
                  name: visual-storybook
                  path: storybook-static

            - run: npm run visual:ci -- capture --share "$SHARE" --storybook storybook-static --out visual-output/head

            - uses: actions/upload-artifact@v7
              with:
                  name: visual-head-share-${{ strategy.job-index }}
                  path: visual-output/head
                  retention-days: 1
                  compression-level: 0
                  if-no-files-found: error

            - if: needs.build.outputs.base-saved != 'true'
              uses: actions/download-artifact@v8
              with:
                  name: visual-base-storybook
                  path: visual-output/base-storybook

            - if: needs.build.outputs.base-saved != 'true'
              run: npm run visual:ci -- capture --share "$SHARE" --storybook visual-output/base-storybook --out visual-output/base

            - if: needs.build.outputs.base-saved != 'true'
              uses: actions/upload-artifact@v7
              with:
                  name: visual-base-share-${{ strategy.job-index }}
                  path: visual-output/base
                  retention-days: 1
                  compression-level: 0
                  if-no-files-found: error

    compare:
        needs: [build, capture]
        runs-on: ubuntu-latest
        timeout-minutes: 30
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
                  cache: npm

            - run: git config --global --add safe.directory "$GITHUB_WORKSPACE"

            - run: npm ci

            - uses: actions/download-artifact@v8
              with:
                  name: visual-storybook
                  path: storybook-static

            - uses: actions/download-artifact@v8
              with:
                  pattern: visual-head-share-*
                  merge-multiple: true
                  path: visual-output/head

            - run: npm run visual:ci -- join --storybook storybook-static --dir visual-output/head --sha "$HEAD_SHA"

            - id: restore
              if: needs.build.outputs.base-saved == 'true'
              uses: actions/cache/restore@v6
              with:
                  path: visual-output/base
                  key: ${{ needs.build.outputs.base-key }}

            - if: needs.build.outputs.base-saved != 'true'
              uses: actions/download-artifact@v8
              with:
                  name: visual-base-storybook
                  path: visual-output/base-storybook

            - if: needs.build.outputs.base-saved != 'true'
              uses: actions/download-artifact@v8
              with:
                  pattern: visual-base-share-*
                  merge-multiple: true
                  path: visual-output/base

            - if: needs.build.outputs.base-saved != 'true'
              run: npm run visual:ci -- join --storybook visual-output/base-storybook --dir visual-output/base --sha "$BASE_SHA"

            # Builds the base itself if the saved captures were dropped since build looked them up.
            - run: npm run visual:ci -- compare --base "$BASE_SHA"

            - if: steps.restore.outputs.cache-hit != 'true'
              uses: actions/cache/save@v6
              with:
                  path: visual-output/base
                  key: ${{ needs.build.outputs.base-key }}

            - uses: actions/upload-artifact@v7
              with:
                  name: visual-report
                  path: visual-output/report
                  retention-days: 1
```

- [ ] **Step 2: Point `publish` and `finish` at the new jobs**

```yaml
    publish:
        needs: compare
```

```yaml
    finish:
        needs: [start, build, capture, compare, publish]
```

- [ ] **Step 3: Run the workflow tests**

Run: `npx vitest run scripts/visual/workflows.test.ts`
Expected: the visual-check checks pass; the visual-baseline `capture`/`save` checks still fail.

### Task 6: The baseline workflow

**Files:** Modify `.github/workflows/visual-baseline.yml` (whole file).

- [ ] **Step 1: Replace the file**

```yaml
name: Visual baseline

# Saves captures for each staging commit, so PRs branching from it don't have to build them.
# Split across jobs like the visual check, so the captures are saved before most PRs need them.
on:
    push:
        branches: [staging]

concurrency:
    group: visual-baseline
    cancel-in-progress: false

permissions:
    contents: read

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
                  key: visual-base-${{ github.sha }}-${{ hashFiles('scripts/visual/capture.ts', 'scripts/visual/stories.ts', 'scripts/visual/config.ts') }}-pw1.55.0
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
            - uses: actions/checkout@v7
              with:
                  persist-credentials: false

            - uses: actions/setup-node@v7
              with:
                  node-version: 22
                  cache: npm

            - run: git config --global --add safe.directory "$GITHUB_WORKSPACE"

            - run: npm ci

            - uses: actions/download-artifact@v8
              with:
                  name: visual-storybook
                  path: storybook-static

            - run: npm run visual:ci -- capture --share "$SHARE" --storybook storybook-static --out visual-output/base

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
            - uses: actions/checkout@v7
              with:
                  persist-credentials: false

            - uses: actions/setup-node@v7
              with:
                  node-version: 22
                  cache: npm

            - run: git config --global --add safe.directory "$GITHUB_WORKSPACE"

            - run: npm ci

            - uses: actions/download-artifact@v8
              with:
                  name: visual-storybook
                  path: storybook-static

            - uses: actions/download-artifact@v8
              with:
                  pattern: visual-base-share-*
                  merge-multiple: true
                  path: visual-output/base

            - run: npm run visual:ci -- join --storybook storybook-static --dir visual-output/base --sha "$GITHUB_SHA"

            - uses: actions/cache/save@v6
              with:
                  path: visual-output/base
                  key: ${{ needs.build.outputs.key }}
```

- [ ] **Step 2: Run the workflow tests**

Run: `npx vitest run scripts/visual/workflows.test.ts`
Expected: PASS.

- [ ] **Step 3: Commit the workflows and their tests**

```bash
git add .github/workflows/visual-check.yml .github/workflows/visual-baseline.yml scripts/visual/workflows.test.ts
git commit -m "KAN-166: capture in 6 parallel jobs, and take the base from the PR event"
```

### Task 7: Docs

**Files:** Modify `docs/storybook.md`, `docs/superpowers/specs/2026-11-06-visual-regression-tool-design.md`.

Developer docs, not user-facing copy; the PR lists the exact lines.

- [ ] **Step 1:** In `docs/storybook.md`, after the "To compare locally" paragraph, add:

```md
CI runs the same steps through `scripts/visual/ci.ts`: one job builds Storybook, 6 jobs each capture a share of the stories, and one job compares them and builds the report.
```

- [ ] **Step 2:** In the 2026-11-06 design, replace the paragraph "New pushes cancel an older run for the same PR. The capture job has a 30-minute timeout, with a target of 15 minutes for the whole run. If phase 3 measures more, captures are split across parallel jobs by a stable hash of the story id." with:

```md
New pushes cancel an older run for the same PR. Phase 3 measured about 20 minutes against a target of 15, so KAN-166 split the captures across 6 jobs by position in the sorted list. See `2026-11-08-visual-parallel-capture-design.md`.
```

- [ ] **Step 3: Commit**

```bash
git add docs/storybook.md docs/superpowers/specs/2026-11-06-visual-regression-tool-design.md
git commit -m "KAN-166: describe the split in the Storybook docs and the design"
```

### Task 8: Full checks

- [ ] `npx tsc --noEmit` — clean.
- [ ] `npx eslint .` — clean.
- [ ] `npx vitest run` — all pass.
- [ ] `npx next build` (background, a few minutes) — succeeds.
- [ ] If `next dev`/`next build` touched `AGENTS.md`, revert it (a local Next run appends a block to it).

### Task 9: PR and measurements

- [ ] Push and open the PR into `staging`: title `KAN-166: Capture the visual check in parallel jobs`. Body: summary, before/after table, trust model, how the base fix works, tests, the doc lines changed. Name only KAN-166 (a key named in a PR body moves that ticket to In Review).
- [ ] Run 1 (base cached, captured by the old single job): must show `0 changed, 0 new, 0 removed, 0 failed, of 1890 captures`. That proves the shots match today's. Record the time per job.
- [ ] Runs 2 and 3: `git commit --allow-empty -m "KAN-166: measure the run time again"`, push, record times. Same zero result.
- [ ] Run 4 (base missing): a throwaway commit adds a comment line to `scripts/visual/stories.ts`, which changes the cache key. Expected: build builds both Storybooks, the shards capture both, compare joins both, saves the cache, and the result is again all zero. Record the time. Then revert the commit and push (run 5, base cached again).
- [ ] Put the before/after table in the PR and on KAN-166.
- [ ] Ask the owner for sign-off in a popup. The visual check reports nothing changed, so there is nothing to approve in the comment; never tick the box.
- [ ] After merge: record the first `visual-baseline` run time on the PR and on KAN-166.
