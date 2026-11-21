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
//   base-state --sha <sha> --cache-hit [true|false|<empty>]                 write state=saved|pending|missing and run-id to $GITHUB_OUTPUT
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
import { baseShareTargets, checkPlan, headShareTargets, planShares, readTimings, shareIdsToCompare, type SharePlan, timingsFrom } from './sharePlan';
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
    // actions/cache leaves cache-hit empty on a miss, so anything but true is a miss.
    const cacheHit = args['cache-hit'] === 'true';
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
