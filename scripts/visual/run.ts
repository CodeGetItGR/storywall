// Captures Storybook and compares it with another commit.
//
//   npm run visual -- --base origin/staging           compare HEAD with where it branched
//   npm run visual -- --base origin/staging --serve   and open the report on a local server
//   npm run visual -- --capture-only                  save HEAD as visual-output/base
//
// Windows renders differently from CI, so a local run only compares with itself.

import { execFileSync, execSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { parseArgs } from 'node:util';

import type { Browser } from 'playwright-core';

import { captureAll, captureTarget, launchBrowser } from './capture';
import { findMissingStories } from './missingStories';
import { buildReport } from './report';
import { serveStatic } from './server';
import { buildCaptureList, type StoryIndex } from './stories';
import type { CaptureRecord } from './types';

const OUT = 'visual-output';
const BASE_DIR = join(OUT, 'base');
const HEAD_DIR = join(OUT, 'head');
const REPORT_DIR = join(OUT, 'report');
const STORYBOOK_DIR = 'storybook-static';

const { values: args } = parseArgs({
    options: {
        base: { type: 'string' },
        'capture-only': { type: 'boolean', default: false },
        serve: { type: 'boolean', default: false },
    },
});

const print = (line: string) => process.stdout.write(`${line}\n`);

const git = (...gitArgs: string[]) => execFileSync('git', gitArgs, { encoding: 'utf8' }).trim();

function buildStorybook(cwd: string, outDir: string) {
    execSync(`npx storybook build --quiet -o "${outDir}"`, { cwd, stdio: 'inherit', env: { ...process.env, STORYBOOK_DISABLE_TELEMETRY: '1' } });
}

function targetsFrom(storybookDir: string) {
    return buildCaptureList(JSON.parse(readFileSync(join(storybookDir, 'index.json'), 'utf8')) as StoryIndex);
}

function saveRecords(dir: string, records: CaptureRecord[], sha: string) {
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'captures.json'), JSON.stringify(records));
    writeFileSync(join(dir, 'sha.txt'), sha);
}

async function captureBuild(browser: Browser, storybookDir: string, outDir: string): Promise<CaptureRecord[]> {
    const server = await serveStatic(storybookDir);
    try {
        return await captureAll(browser, server.origin, targetsFrom(storybookDir), outDir);
    } finally {
        await server.close();
    }
}

// Reuses saved captures when they belong to this commit. Otherwise builds that commit in a
// temporary worktree. A commit from before Storybook existed has no captures, so all stories count as new.
async function loadOrBuildBase(browser: Browser, baseSha: string): Promise<CaptureRecord[]> {
    const shaFile = join(BASE_DIR, 'sha.txt');
    if (existsSync(shaFile) && readFileSync(shaFile, 'utf8').trim() === baseSha) {
        print(`Using saved captures for ${baseSha}`);
        return JSON.parse(readFileSync(join(BASE_DIR, 'captures.json'), 'utf8')) as CaptureRecord[];
    }
    print(`Building captures for ${baseSha}`);
    rmSync(BASE_DIR, { recursive: true, force: true });
    mkdirSync(BASE_DIR, { recursive: true });
    const source = resolve(OUT, 'base-src');
    rmSync(source, { recursive: true, force: true });
    git('worktree', 'prune');
    git('worktree', 'add', '--detach', source, baseSha);
    let records: CaptureRecord[] = [];
    try {
        if (existsSync(join(source, '.storybook', 'main.ts'))) {
            execSync('npm ci', { cwd: source, stdio: 'inherit' });
            const storybookDir = join(source, STORYBOOK_DIR);
            buildStorybook(source, storybookDir);
            records = await captureBuild(browser, storybookDir, BASE_DIR);
        }
    } finally {
        // A locked file on Windows must not hide the real error or discard finished captures.
        try {
            git('worktree', 'remove', '--force', source);
        } catch (error) {
            console.warn(`Could not remove the temporary worktree ${source}: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    saveRecords(BASE_DIR, records, baseSha);
    return records;
}

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
    const headSha = git('rev-parse', 'HEAD');
    const baseSha = git('merge-base', baseRef, 'HEAD');
    rmSync(HEAD_DIR, { recursive: true, force: true });
    rmSync(REPORT_DIR, { recursive: true, force: true });
    buildStorybook('.', STORYBOOK_DIR);

    const browser = await launchBrowser();
    const server = await serveStatic(STORYBOOK_DIR);
    try {
        const headRecords = await captureAll(browser, server.origin, targetsFrom(STORYBOOK_DIR), HEAD_DIR);
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
            retake: (target) => captureTarget(browser, server.origin, target, HEAD_DIR),
        });
        copyFileSync(join('scripts', 'visual', 'report', 'index.html'), join(REPORT_DIR, 'index.html'));
        const { changed, removed, failed } = manifest.counts;
        print(`${changed} changed, ${manifest.counts.new} new, ${removed} removed, ${failed} failed, of ${manifest.totalCaptures} captures.`);
        for (const entry of manifest.entries.filter((item) => item.state === 'failed')) print(`FAILED ${entry.id}: ${entry.error}`);
    } finally {
        await server.close();
        await browser.close();
    }

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
